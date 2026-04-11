/**
 * Allow only same-origin paths and http(s) URLs for <img src> / CSS url().
 * Rejects javascript:, data: (except optional future safe subsets), and malformed URLs.
 */
export function sanitizeDisplayableImageUrl(url) {
  const s = String(url ?? "").trim();
  if (!s) return "";
  if (s.startsWith("/")) {
    if (s.startsWith("//")) return "";
    return s;
  }
  try {
    const u = new URL(s);
    if (u.protocol === "https:" || u.protocol === "http:") return s;
  } catch {
    /* ignore */
  }
  return "";
}
