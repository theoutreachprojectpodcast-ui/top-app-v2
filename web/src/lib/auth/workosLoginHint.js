/**
 * Sanitize login_hint for WorkOS authorization URL (server-side).
 * Rejects non-emails and oversized values.
 */
export function sanitizeWorkOSLoginHint(raw) {
  const s = String(raw ?? "").trim().slice(0, 320);
  if (!s) return undefined;
  if (s.length > 254) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return undefined;
  return s;
}
