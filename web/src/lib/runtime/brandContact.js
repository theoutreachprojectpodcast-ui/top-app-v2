/**
 * Public support contact — must use the owned .app domain only (not .com).
 */
export const SUPPORT_EMAIL = "support@theoutreachproject.app";

/**
 * @param {{ subject?: string, body?: string }} [opts]
 */
export function supportMailtoHref(opts = {}) {
  const q = new URLSearchParams();
  const subject = String(opts.subject || "").trim();
  const body = String(opts.body || "").trim();
  if (subject) q.set("subject", subject);
  if (body) q.set("body", body);
  const qs = q.toString();
  return `mailto:${SUPPORT_EMAIL}${qs ? `?${qs}` : ""}`;
}
