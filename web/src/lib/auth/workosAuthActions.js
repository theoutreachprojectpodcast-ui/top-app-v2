"use server";

import { resolveWorkOSSignInFromSearchParams } from "@/lib/auth/workosSignInUrl";
import { resolveWorkOSSignUpFromSearchParams } from "@/lib/auth/workosSignUpUrl";
import { toWorkOSUrlSearchParams } from "@/lib/auth/workosSearchParams";

function handoffErrorMessage(err) {
  const message = err instanceof Error ? err.message : String(err);
  if (message === "authentication_not_configured" || message === "workos_not_configured") {
    return "WorkOS AuthKit is not configured yet.";
  }
  return message || "Could not start secure sign in.";
}

/**
 * Mint PKCE cookie + WorkOS authorize URL (Server Actions may set cookies; RSC pages may not).
 * @param {Record<string, string | string[] | undefined>} rawParams
 * @param {{ mode?: "signin" | "signup", fallbackReturn?: string }} options
 */
export async function startWorkOSAuthHandoff(rawParams, options = {}) {
  const mode = options.mode === "signup" ? "signup" : "signin";
  const fallbackReturn = options.fallbackReturn || (mode === "signup" ? "/onboarding" : "/");
  const params = toWorkOSUrlSearchParams(rawParams || {});

  try {
    const url =
      mode === "signup"
        ? await resolveWorkOSSignUpFromSearchParams(params, fallbackReturn)
        : await resolveWorkOSSignInFromSearchParams(params, fallbackReturn);
    return { ok: true, url };
  } catch (err) {
    console.error("[torp] WorkOS auth handoff failed:", err);
    return { ok: false, message: handoffErrorMessage(err) };
  }
}
