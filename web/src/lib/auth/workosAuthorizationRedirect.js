import { sealData } from "iron-session";
import { cookies } from "next/headers";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { workosMobileRedirectUri } from "@/lib/auth/workosMobileRedirect";
import { TORP_OAUTH_SHELL_COOKIE, TORP_OAUTH_SHELL_NATIVE } from "@/lib/auth/workosOAuthShell";

/** AuthKit callback expects this exact cookie name (`handleAuth` in @workos-inc/authkit-nextjs). */
export const WORKOS_PKCE_COOKIE_NAME = "wos-auth-verifier";

export function workosPkceCookieOptions() {
  const domain = String(process.env.WORKOS_COOKIE_DOMAIN || "").trim();
  const redirectUri = String(
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || process.env.WORKOS_REDIRECT_URI || "",
  ).trim();
  let secure = true;
  try {
    if (redirectUri) secure = new URL(redirectUri).protocol === "https:";
  } catch {
    secure = true;
  }
  const sameSiteRaw = String(process.env.WORKOS_COOKIE_SAMESITE || "lax").toLowerCase();
  const sameSite = ["lax", "strict", "none"].includes(sameSiteRaw) ? sameSiteRaw : "lax";
  return {
    path: "/",
    httpOnly: true,
    secure: sameSite === "none" ? true : secure,
    sameSite: sameSite === "strict" ? "lax" : sameSite,
    maxAge: 600,
    ...(domain ? { domain } : {}),
  };
}

/**
 * Build a WorkOS AuthKit authorize URL and set the PKCE verifier cookie (same as AuthKit helpers).
 *
 * @param {{
 *   returnPathname?: string,
 *   screenHint?: "sign-in" | "sign-up",
 *   loginHint?: string,
 *   prompt?: string,
 *   invitationToken?: string,
 *   organizationId?: string,
 *   useMobileRedirect?: boolean,
 *   markNativeShell?: boolean,
 * }} [options]
 */
export async function getWorkOSAuthKitRedirectUrl(options = {}) {
  const clientId = String(process.env.WORKOS_CLIENT_ID || "").trim();
  const webRedirectUri = String(
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || process.env.WORKOS_REDIRECT_URI || "",
  ).trim();
  const redirectUri = options.useMobileRedirect ? workosMobileRedirectUri() : webRedirectUri;
  const password = String(process.env.WORKOS_COOKIE_PASSWORD || "");
  if (!clientId || !redirectUri || password.length < 32) {
    throw new Error("workos_not_configured");
  }

  const workos = getWorkOS();
  const pkce = await workos.pkce.generate();
  const state = {
    nonce: crypto.randomUUID(),
    codeVerifier: pkce.codeVerifier,
    returnPathname: options.returnPathname || "/",
  };
  const sealedState = await sealData(state, { password, ttl: 600 });
  const cookieStore = await cookies();
  const cookieOpts = workosPkceCookieOptions();
  cookieStore.set(WORKOS_PKCE_COOKIE_NAME, sealedState, cookieOpts);
  if (options.markNativeShell) {
    cookieStore.set(TORP_OAUTH_SHELL_COOKIE, TORP_OAUTH_SHELL_NATIVE, cookieOpts);
  }

  return workos.userManagement.getAuthorizationUrl({
    provider: "authkit",
    clientId,
    redirectUri,
    screenHint: options.screenHint || "sign-in",
    state: sealedState,
    codeChallenge: pkce.codeChallenge,
    codeChallengeMethod: pkce.codeChallengeMethod,
    ...(options.loginHint ? { loginHint: options.loginHint } : {}),
    ...(options.prompt ? { prompt: options.prompt } : {}),
    ...(options.invitationToken ? { invitationToken: options.invitationToken } : {}),
    ...(options.organizationId ? { organizationId: options.organizationId } : {}),
  });
}

/** @param {URLSearchParams} searchParams */
export function readWorkOSInvitationToken(searchParams) {
  return String(searchParams.get("invitation_token") || searchParams.get("token") || "").trim();
}
