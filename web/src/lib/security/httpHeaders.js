const ONE_YEAR_SECONDS = 31536000;

function compact(parts = []) {
  return parts.filter(Boolean).join("; ");
}

export function buildContentSecurityPolicy() {
  return compact([
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline' https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "connect-src 'self' https: wss:",
    "form-action 'self' https://api.workos.com https://*.workos.com",
    "upgrade-insecure-requests",
  ]);
}

export function applySecurityHeaders(response, request) {
  const isHttps = request.nextUrl.protocol === "https:";
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()",
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-site");
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy());
  if (isHttps) {
    response.headers.set("Strict-Transport-Security", `max-age=${ONE_YEAR_SECONDS}; includeSubDomains; preload`);
  }
  return response;
}
