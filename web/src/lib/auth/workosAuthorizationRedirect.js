import { sealData } from "iron-session";
import { cookies } from "next/headers";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { workOSAuthRedirectBridge } from "@/lib/auth/workosAuthRedirectBridge";
import { workosMobileRedirectUri } from "@/lib/auth/workosMobileRedirect";
import { TORP_OAUTH_SHELL_COOKIE, TORP_OAUTH_SHELL_NATIVE } from "@/lib/auth/workosOAuthShell";

/** AuthKit callback expects this exact cookie name (`handleAuth` in @workos-inc/authkit-nextjs). */
export const WORKOS_PKCE_COOKIE_NAME = "wos-auth-verifier";

/** @deprecated AuthKit v3 uses a single cookie name; kept for call-site compatibility. */
export function pkceCookieNameForState(_sealedState) {
  return WORKOS_PKCE_COOKIE_NAME;
}

/**
 * HTML bridge to WorkOS with PKCE (+ optional native shell marker) on the response.
 * @param {{ url: string, sealedState: string }} bundle
 * @param {boolean} [markNativeShell=false]
 */
export function workOSAuthorizeBridgeFromBundle(bundle, markNativeShell = false) {
  const response = workOSAuthRedirectBridge(bundle.url);
  attachWorkOSAuthorizeCookies(response, bundle.sealedState, markNativeShell);
  return response;
}

/** Attach PKCE (+ optional native shell marker) on the HTML bridge response. */
export function attachWorkOSAuthorizeCookies(response, sealedState, markNativeShell = false) {
  const state = String(sealedState || "").trim();
  if (!state || !response?.cookies) return response;
  const opts = workosPkceCookieOptions();
  response.cookies.set(WORKOS_PKCE_COOKIE_NAME, state, opts);
  if (markNativeShell) {
    response.cookies.set(TORP_OAUTH_SHELL_COOKIE, TORP_OAUTH_SHELL_NATIVE, opts);
  }
  return response;
}

/**
 * True when the browser tab holds a WorkOS PKCE verifier cookie.
 * @param {Request} request
 * @param {string} [oauthState] OAuth `state` query param from the callback URL
 */
export function requestHasWorkOSPkceCookie(request, oauthState = "") {
  const jar = request.cookies;
  if (jar.get(WORKOS_PKCE_COOKIE_NAME)?.value) return true;

  const state = String(oauthState || "").trim();
  if (state && jar.get(pkceCookieNameForState(state))?.value) return true;

  const all = typeof jar.getAll === "function" ? jar.getAll() : [];
  for (const cookie of all) {
    if (
      cookie.value &&
      (cookie.name === WORKOS_PKCE_COOKIE_NAME || cookie.name.startsWith(`${WORKOS_PKCE_COOKIE_NAME}-`))
    ) {
      return true;
    }
  }
  return false;
}

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

async function fetchWorkOSClaimNonce(clientId) {
  const claimToken = String(process.env.WORKOS_CLAIM_TOKEN || "").trim();
  if (!claimToken || !clientId) return null;
  try {
    const workos = getWorkOS();
    const res = await fetch(`${workos.baseURL}/x/one-shot-environments/claim-nonces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, claim_token: claimToken }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return String(data?.nonce || "").trim() || null;
  } catch {
    return null;
  }
}

/**
 * Read OAuth `state` from a WorkOS authorize URL without URLSearchParams `+` → space mangling.
 * Prefer passing sealed state via `s` on `/auth/workos-browser-start` when possible.
 * @param {string} authorizeUrl
 */
export function oauthStateFromAuthorizeUrl(authorizeUrl) {
  const raw = String(authorizeUrl || "").trim();
  const qIdx = raw.indexOf("?");
  if (qIdx === -1) return "";
  for (const segment of raw.slice(qIdx + 1).split("&")) {
    if (!segment) continue;
    const eq = segment.indexOf("=");
    const name = eq === -1 ? segment : segment.slice(0, eq);
    if (decodeURIComponent(name) !== "state") continue;
    if (eq === -1) return "";
    return decodeURIComponent(segment.slice(eq + 1));
  }
  return "";
}

/**
 * Mint PKCE cookie + WorkOS authorize URL (AuthKit-compatible sealed state).
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
 * @returns {Promise<{ url: string, sealedState: string }>}
 */
export async function getWorkOSAuthKitAuthorizeBundle(options = {}) {
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
  const claimNonce = await fetchWorkOSClaimNonce(clientId);
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

  const url = workos.userManagement.getAuthorizationUrl({
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
    ...(claimNonce ? { claimNonce } : {}),
  });

  return { url, sealedState };
}

/**
 * @param {Parameters<typeof getWorkOSAuthKitAuthorizeBundle>[0]} [options]
 * @returns {Promise<string>}
 */
export async function getWorkOSAuthKitRedirectUrl(options = {}) {
  const { url } = await getWorkOSAuthKitAuthorizeBundle(options);
  return url;
}

/** @param {URLSearchParams} searchParams */
export function readWorkOSInvitationToken(searchParams) {
  return String(searchParams.get("invitation_token") || searchParams.get("token") || "").trim();
}
