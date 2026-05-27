import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { isDefaultApprovedAdminEmail } from "@/lib/admin/adminPolicy";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { workosSignInLink } from "@/lib/auth/workosReturnTo";
import { profileTableName } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-app-api-admin-users-invite-post" });
  if (!ctx.ok) return ctx.response;
  if (!isWorkOSConfigured()) {
    return Response.json({ ok: false, error: "workos_not_configured" }, { status: 503 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const table = profileTableName();
  const { data: row } = await ctx.admin
    .from(table)
    .select("email, platform_role, admin_access_enabled")
    .eq("email", email)
    .maybeSingle();

  const hasDbAdminAccess =
    row &&
    String(row.platform_role || "").toLowerCase() === "admin" &&
    (row.admin_access_enabled == null || !!row.admin_access_enabled);

  if (!isDefaultApprovedAdminEmail(email) && !hasDbAdminAccess) {
    return Response.json({ ok: false, error: "email_not_admin_approved" }, { status: 403 });
  }

  // WorkOS hosted auth will send/handle passwordless where configured by the IdP/provider.
  const signInUrl = workosSignInLink("/admin", { loginHint: email, rememberDevice: true });
  return Response.json({
    ok: true,
    email,
    signInUrl,
    message: "Admin sign-in link generated. Open the hosted sign-in and complete magic/passwordless flow.",
  });
}

