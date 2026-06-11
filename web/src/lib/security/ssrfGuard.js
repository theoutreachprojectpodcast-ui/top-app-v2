/**
 * Block private/metadata targets for server-side fetch of user-supplied URLs.
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
]);

function isPrivateIpv4(host) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

/**
 * @param {string} rawUrl
 * @returns {{ ok: true, url: URL } | { ok: false, reason: string }}
 */
export function validateOutboundFetchUrl(rawUrl) {
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

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, reason: "blocked_host" };
  }
  if (isPrivateIpv4(host)) {
    return { ok: false, reason: "private_ip" };
  }

  return { ok: true, url: parsed };
}
