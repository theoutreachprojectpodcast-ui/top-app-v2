"use client";

import { closeExternalBrowserIfOpen } from "@/lib/capacitor/openExternalUrl";
import { parseMobileDeepLinkUrl } from "@/lib/capacitor/mobileDeepLinks";
import { resolveMobileNativePostLoginPath } from "@/lib/capacitor/mobilePostLoginReturn";
import { safeAppReturnPath } from "@/lib/billing/stripeConfig";
import { logMobileBootEvent } from "@/lib/capacitor/mobileBootDiagnostics";

/**
 * Handle Capacitor appUrlOpen deep links after mobile browser WorkOS auth.
 * @param {string} url
 * @param {{
 *   refreshAccountStatus: () => Promise<{ ok: boolean }>,
 *   router: { replace: (path: string, opts?: object) => void },
 * }} handlers
 */
export async function handleMobileAuthDeepLink(url, handlers) {
  const parsed = parseMobileDeepLinkUrl(url);
  if (!parsed) return { handled: false };

  if (parsed.kind === "account-refresh") {
    await closeExternalBrowserIfOpen();
    const result = await handlers.refreshAccountStatus();
    if (result.ok) {
      handlers.router.replace("/profile?mobileReturn=account");
    }
    return { handled: true, kind: parsed.kind };
  }

  if (parsed.kind === "auth-complete") {
    await closeExternalBrowserIfOpen();
    const params = new URLSearchParams();
    params.set("token", parsed.token);
    const returnTo = resolveMobileNativePostLoginPath(
      safeAppReturnPath(parsed.returnTo, "/"),
    );
    if (returnTo.startsWith("/onboarding")) params.set("returnTo", returnTo);

    const res = await fetch(`/api/auth/mobile/complete?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.ok) {
      logMobileBootEvent("mobile_auth_complete_failed", { status: res.status });
      return { handled: true, kind: parsed.kind, ok: false };
    }

    logMobileBootEvent("mobile_auth_complete_ok");
    await handlers.refreshAccountStatus();
    handlers.router.replace(
      resolveMobileNativePostLoginPath(String(body.returnTo || returnTo || "/")),
    );
    return { handled: true, kind: parsed.kind, ok: true };
  }

  return { handled: false };
}
