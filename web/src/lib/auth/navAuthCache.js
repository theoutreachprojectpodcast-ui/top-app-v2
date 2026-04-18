/** Session snapshot for instant header auth UI between client navigations (WorkOS cookie remains source of truth). */

export const TORP_NAV_AUTH_CACHE_KEY = "torp_nav_auth_v1";
const MAX_STALE_MS = 1000 * 60 * 45;

export function readNavAuthCache() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TORP_NAV_AUTH_CACHE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o.t !== "number") return null;
    if (Date.now() - o.t > MAX_STALE_MS) return null;
    return { authenticated: !!o.authenticated, workos: !!o.workos, t: o.t };
  } catch {
    return null;
  }
}

export function writeNavAuthCache(authenticated, workos) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      TORP_NAV_AUTH_CACHE_KEY,
      JSON.stringify({ authenticated: !!authenticated, workos: !!workos, t: Date.now() }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearNavAuthCache() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(TORP_NAV_AUTH_CACHE_KEY);
  } catch {
    /* ignore */
  }
}
