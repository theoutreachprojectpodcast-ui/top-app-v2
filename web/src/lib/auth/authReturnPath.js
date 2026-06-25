/** Paths that must never be used as post-auth `returnTo` (prevents sign-in loops). */
const AUTH_ENTRY_PATHS = [
  /^\/sign-in(\/|$|\?)/,
  /^\/sign-up(\/|$|\?)/,
  /^\/signup(\/|$|\?)/,
  /^\/login(\/|$|\?)/,
  /^\/auth\/sign-in(\/|$|\?)/,
  /^\/auth\/sign-up(\/|$|\?)/,
  /^\/auth\/workos-go(\/|$|\?)/,
  /^\/auth\/workos-browser-start(\/|$|\?)/,
  /^\/auth\/workos-native-browser(\/|$|\?)/,
  /^\/callback(\/|$|\?)/,
  /^\/mobile\/auth\//,
  /^\/mobile-auth\//,
];

/**
 * @param {string} [rawPath] pathname only or path with query
 */
export function isAuthEntryReturnPath(rawPath) {
  const path = String(rawPath || "/").trim() || "/";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return AUTH_ENTRY_PATHS.some((re) => re.test(normalized));
}

/**
 * Safe same-origin return path after WorkOS — never an auth handoff route.
 * @param {string} [raw]
 * @param {string} [fallback]
 */
export function sanitizeAuthReturnPath(raw, fallback = "/") {
  const fb = String(fallback || "/").trim().startsWith("/") ? String(fallback || "/").trim() : "/";
  const s = String(raw || "").trim();
  if (!s.startsWith("/") || s.startsWith("//")) return fb;
  const qIdx = s.indexOf("?");
  const pathOnly = qIdx >= 0 ? s.slice(0, qIdx) : s;
  if (isAuthEntryReturnPath(pathOnly)) return fb;
  return s;
}
