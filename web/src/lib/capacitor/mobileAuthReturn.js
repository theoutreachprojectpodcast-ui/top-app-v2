"use client";

import { closeExternalBrowserIfOpen } from "@/lib/capacitor/openExternalUrl";
import { parseMobileDeepLinkUrl } from "@/lib/capacitor/mobileDeepLinks";
import { safeAppReturnPath } from "@/lib/billing/stripeConfig";

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
    const returnTo = safeAppReturnPath(parsed.returnTo, "/");
    if (returnTo !== "/") params.set("returnTo", returnTo);

    const res = await fetch(`/api/auth/mobile/complete?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.ok) {
      return { handled: true, kind: parsed.kind, ok: false };
    }

    await handlers.refreshAccountStatus();
    handlers.router.replace(String(body.returnTo || returnTo || "/"));
    return { handled: true, kind: parsed.kind, ok: true };
  }

  return { handled: false };
}
