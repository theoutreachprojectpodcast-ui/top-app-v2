/**
 * Strip common boilerplate / noise from extracted plain text before storage or verification.
 */
export function normalizeContentText(text) {
  let t = String(text || "");
  t = t.replace(/\b(accept all cookies|reject all|cookie settings|we use cookies)\b/gi, " ");
  t = t.replace(/\b(click here to|subscribe to our newsletter)\b/gi, " ");
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}
