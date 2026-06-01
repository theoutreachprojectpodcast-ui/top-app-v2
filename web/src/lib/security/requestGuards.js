import { appBaseUrl } from "@/lib/billing/stripeConfig";

const windows = new Map();

export function requestIp(request) {
  const fwd = String(request.headers.get("x-forwarded-for") || "").trim();
  if (fwd) return fwd.split(",")[0].trim();
  return String(request.headers.get("x-real-ip") || "unknown").trim() || "unknown";
}

export function requestUserAgent(request) {
  return String(request.headers.get("user-agent") || "").slice(0, 512);
}

function originHost(origin) {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return "";
  }
}

export function enforceSameOrigin(request) {
  const method = String(request.method || "").toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return { ok: true };
  const origin = String(request.headers.get("origin") || "").trim();
  if (!origin) return { ok: false, status: 403, error: "missing_origin" };

  const fromOrigin = originHost(origin);
  if (!fromOrigin) return { ok: false, status: 403, error: "invalid_origin" };

  const requestHost = String(request.nextUrl?.host || "").toLowerCase();
  if (requestHost && fromOrigin === requestHost) return { ok: true };

  const expected = appBaseUrl().replace(/\/$/, "");
  if (expected) {
    const configuredHost = originHost(expected.startsWith("http") ? expected : `https://${expected}`);
    if (configuredHost && configuredHost === fromOrigin) return { ok: true };
    if (expected.toLowerCase() === origin.toLowerCase()) return { ok: true };
  }

  return { ok: false, status: 403, error: "origin_mismatch" };
}

/**
 * Lightweight per-instance throttle.
 * For distributed production rate limiting, prefer a shared store (Redis/Upstash).
 */
export function rateLimit(request, keyPrefix, { limit = 30, windowMs = 60000 } = {}) {
  const now = Date.now();
  const ip = requestIp(request);
  const key = `${keyPrefix}:${ip}`;
  const hit = windows.get(key);
  if (!hit || hit.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (hit.count >= limit) {
    return { ok: false, status: 429, error: "rate_limited", retryAfterMs: Math.max(0, hit.resetAt - now) };
  }
  hit.count += 1;
  windows.set(key, hit);
  return { ok: true, remaining: Math.max(0, limit - hit.count) };
}
