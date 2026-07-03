/**
 * Minimal HTML sanitizer for admin-authored rich text (community posts, content blocks).
 * Strips scripts, event handlers, and javascript: URLs.
 */
export function sanitizeAdminHtml(html) {
  if (!html || typeof html !== "string") return "";
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/javascript:/gi, "");
  return s.trim();
}

export function isLikelyHtml(text) {
  return /<\/?[a-z][\s\S]*>/i.test(String(text || ""));
}

export function htmlToPlainText(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
