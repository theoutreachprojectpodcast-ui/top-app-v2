/** Session snapshot for instant header auth UI between client navigations (WorkOS cookie remains source of truth). */

export const TOP_NAV_AUTH_CACHE_KEY = "top_nav_auth_v1";
const MAX_STALE_MS = 1000 * 60 * 45;

export function readNavAuthCache() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw =
      sessionStorage.getItem(TOP_NAV_AUTH_CACHE_KEY) ||
      sessionStorage.getItem("torp_nav_auth_v1");
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o.t !== "number") return null;
    if (Date.now() - o.t > MAX_STALE_MS) return null;
    return {
      authenticated: !!o.authenticated,
      workos: !!o.workos,
      hasFreeAccess: !!o.hasFreeAccess,
      t: o.t,
    };
  } catch {
    return null;
  }
}

/**
 * @param {boolean} authenticated
 * @param {boolean} workos
 * @param {{ hasFreeAccess?: boolean }} [extra]
 */
export function writeNavAuthCache(authenticated, workos, extra = {}) {
  if (typeof sessionStorage === "undefined") return;
  try {
    const hasFreeAccess =
      extra.hasFreeAccess !== undefined ? !!extra.hasFreeAccess : false;
    sessionStorage.setItem(
      TOP_NAV_AUTH_CACHE_KEY,
      JSON.stringify({
        authenticated: !!authenticated,
        workos: !!workos,
        hasFreeAccess,
        t: Date.now(),
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearNavAuthCache() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(TOP_NAV_AUTH_CACHE_KEY);
    sessionStorage.removeItem("torp_nav_auth_v1");
  } catch {
    /* ignore */
  }
}
