import { NextResponse } from "next/server";
import { handleAuth } from "@workos-inc/authkit-nextjs";
import { isDefaultApprovedAdminEmail } from "@/lib/admin/adminPolicy";
import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { patchProfileByWorkOSId, upsertProfileFromWorkOSUser, getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { requestOriginForStripeRedirects } from "@/lib/billing/stripeConfig";
import { notifyStaffProfiles } from "@/server/notifications/notificationService";
import { ensureWorkOSOrganizationMembership } from "@/lib/auth/workosEnsureOrgMembership";
import { isCapacitorCallbackRequest } from "@/lib/auth/workosCallbackRequest";
import { workosCallbackErrorMessage } from "@/lib/auth/workosCallbackErrors";
import { resolveMobileAppPostAuthPath } from "@/lib/auth/workosCallbackServer";
import { clearOAuthNativeShell, oauthShellClearCookieHeader, oauthStartedInNativeShell } from "@/lib/auth/workosOAuthShell";

async function onWorkOSSuccess({ user }) {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return;
    const out = await upsertProfileFromWorkOSUser(admin, user);
    await ensureWorkOSOrganizationMembership(user.id);
    const email = String(user?.email || "").trim();
    const row = await getProfileRowByWorkOSId(admin, user.id);
    const isAdmin =
      (email && isDefaultApprovedAdminEmail(email)) ||
      isPlatformAdminServer({ email, workosUserId: user.id, profileRow: row });
    if (out?.ok && isAdmin) {
      const tier = String(row?.membership_tier || "free").toLowerCase();
      await patchProfileByWorkOSId(admin, user.id, {
        platform_role: "admin",
        admin_access_enabled: true,
        admin_access_granted_by: String(row?.admin_access_granted_by || "").trim() || "workos-bootstrap",
        ...(tier === "free" || !tier
          ? { membership_tier: "member", membership_status: "active", onboarding_completed: true }
          : {}),
      });
    }
    if (out?.ok && out.isNew) {
      await notifyStaffProfiles(admin, {
        type: "new_user_signup",
        title: "New member signed up",
        message: `${user.email || user.id} created a TOP account (first WorkOS sign-in).`,
        linkPath: "/profile",
        entityType: "workos_user",
        entityId: user.id,
        dedupeHours: 1,
        metadata: { workos_user_id: user.id },
      });
    }
  } catch (e) {
    console.error("[torp] WorkOS onSuccess profile sync failed:", e);
  }
}

/** @param {Request} request */
export function createWorkOSCallbackHandler(request) {
  const baseURL = requestOriginForStripeRedirects(request);
  return handleAuth({
    returnPathname: "/",
    baseURL,
    onSuccess: onWorkOSSuccess,
    onError: async ({ error }) => {
      console.error("[torp] WorkOS callback failed:", error?.message || error);
      const description = workosCallbackErrorMessage(error);
      return NextResponse.json(
        {
          error: {
            message: "Authentication failed",
            description,
          },
        },
        { status: 400 },
      );
    },
  });
}

/** @param {Response} response */
function extractSetCookies(response) {
  if (!response?.headers) return [];
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

/** Copy Set-Cookie headers from an auth handler response onto another response. */
export function forwardAuthSetCookies(from, to) {
  if (!from?.headers) return;
  if (typeof from.headers.getSetCookie === "function") {
    for (const cookie of from.headers.getSetCookie()) {
      to.headers.append("Set-Cookie", cookie);
    }
    return;
  }
  const single = from.headers.get("set-cookie");
  if (single) to.headers.append("Set-Cookie", single);
}

/**
 * Complete OAuth in the in-app browser sheet and capture session cookies for WKWebView handoff.
 * @param {Request} request
 * @returns {Promise<{ ok: true, setCookies: string[], redirectTo: string } | { ok: false, message: string }>}
 */
export async function runWorkOSCallbackCapture(request) {
  const handler = createWorkOSCallbackHandler(request);
  let response;
  try {
    response = await handler(request);
  } catch (err) {
    return { ok: false, message: workosCallbackErrorMessage(err) };
  }
  if (!response) {
    return { ok: false, message: "Could not complete sign in. Please try again." };
  }
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("Location") || "";
    let redirectTo = "/";
    if (location) {
      try {
        const u = new URL(location, request.url);
        redirectTo = `${u.pathname}${u.search}`;
      } catch {
        redirectTo = "/";
      }
    }
    redirectTo = resolveMobileAppPostAuthPath(redirectTo, "TheOutreachProject/Capacitor", true);
    return { ok: true, setCookies: extractSetCookies(response), redirectTo };
  }

  let message = "Could not complete sign in. Please try again.";
  try {
    const body = await response.json();
    message = body?.error?.description || body?.error?.message || message;
  } catch {
    /* ignore */
  }
  return { ok: false, message };
}

/**
 * Run WorkOS callback for Capacitor / fetch clients — JSON + Set-Cookie (no route-handler navigation).
 * @param {Request} request
 */
export async function runWorkOSCallbackForFetch(request) {
  const handler = createWorkOSCallbackHandler(request);
  let inner;
  try {
    inner = await handler(request);
  } catch (err) {
    console.error("[torp] WorkOS callback handler threw:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "workos_callback_failed",
        message: workosCallbackErrorMessage(err),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!inner) {
    return NextResponse.json(
      {
        ok: false,
        error: "workos_callback_failed",
        message: "Could not complete sign in. Please try again.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const location = inner.headers.get("Location") || "";
  let redirectTo = "/";
  if (location) {
    try {
      const u = new URL(location, request.url);
      redirectTo = `${u.pathname}${u.search}`;
    } catch {
      redirectTo = "/";
    }
  }

  const ok = inner.status >= 300 && inner.status < 400;
  if (!ok) {
    let message = "Could not complete sign in. Please try again.";
    try {
      const body = await inner.json();
      message = body?.error?.description || body?.error?.message || message;
    } catch {
      /* ignore */
    }
    const out = NextResponse.json({ ok: false, error: "workos_callback_failed", message }, { status: 400 });
    forwardAuthSetCookies(inner, out);
    return out;
  }

  const out = NextResponse.json(
    { ok: true, redirectTo },
    { headers: { "Cache-Control": "no-store" } },
  );
  forwardAuthSetCookies(inner, out);
  return out;
}

/**
 * Document navigation to `/callback?code=…` — must run in a Route Handler (sets session cookies).
 * @param {Request} request
 */
export async function runWorkOSCallbackDocument(request) {
  const handler = createWorkOSCallbackHandler(request);
  let response;
  try {
    response = await handler(request);
  } catch (err) {
    throw new Error(workosCallbackErrorMessage(err));
  }

  if (!response) {
    throw new Error("Could not complete sign in. Please try again.");
  }

  if (response.status >= 300 && response.status < 400) {
    const ua = request.headers.get("user-agent") || "";
    const location = response.headers.get("Location") || "";
    let redirectTo = "/";
    if (location) {
      try {
        const u = new URL(location, request.url);
        redirectTo = `${u.pathname}${u.search}`;
      } catch {
        redirectTo = "/";
      }
    }
    const startedInApp = oauthStartedInNativeShell(request);
    redirectTo = resolveMobileAppPostAuthPath(redirectTo, ua, startedInApp);
    const dest = new URL(redirectTo, request.url);
    const out = NextResponse.redirect(dest, response.status);
    forwardAuthSetCookies(response, out);
    if (startedInApp) {
      await clearOAuthNativeShell();
      out.headers.append("Set-Cookie", oauthShellClearCookieHeader());
    }
    out.headers.set("Cache-Control", "no-store");
    return out;
  }

  let message = "Could not complete sign in. Please try again.";
  try {
    const body = await response.json();
    message = body?.error?.description || body?.error?.message || message;
  } catch {
    /* ignore */
  }
  throw new Error(message);
}

/**
 * @param {Request} request
 */
export async function runWorkOSCallback(request) {
  if (isCapacitorCallbackRequest(request)) {
    return runWorkOSCallbackForFetch(request);
  }
  return runWorkOSCallbackDocument(request);
}
