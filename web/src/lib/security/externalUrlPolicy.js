/**
 * Allowlist for URLs opened in the system browser from Capacitor (signup, billing, etc.).
 */

const DEFAULT_ALLOWED_HOSTS = Object.freeze([
  "theoutreachproject.app",
  "www.theoutreachproject.app",
  "qa.theoutreachproject.app",
  "admin.theoutreachproject.app",
]);

function allowedHosts() {
  const extra = String(process.env.EXTERNAL_URL_ALLOWED_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const fromApp = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "")
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .toLowerCase();
  const set = new Set([...DEFAULT_ALLOWED_HOSTS, ...extra]);
  if (fromApp) set.add(fromApp);
  return set;
}

/**
 * @param {string} rawUrl
 * @returns {{ ok: true, url: URL } | { ok: false, reason: string }}
 */
export function validateExternalBrowserUrl(rawUrl) {
  const target = String(rawUrl || "").trim();
  if (!target) return { ok: false, reason: "missing_url" };

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "unsupported_protocol" };
  }

  if (parsed.protocol === "http:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    return { ok: false, reason: "http_not_allowed" };
  }

  const host = parsed.hostname.toLowerCase();
  const allowed = allowedHosts();

  const hostOk =
    allowed.has(host) ||
    host.endsWith(".workos.com") ||
    host.endsWith(".vercel.app");

  if (!hostOk) {
    return { ok: false, reason: "host_not_allowed" };
  }

  return { ok: true, url: parsed };
}
