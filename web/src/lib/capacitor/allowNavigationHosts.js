/**
 * Capacitor `server.allowNavigation` host patterns (hostname only — no `https://` prefix).
 * @see https://capacitorjs.com/docs/config#server
 */
const CAPACITOR_ALLOW_NAVIGATION_HOSTS = [
  "theoutreachproject.app",
  "*.theoutreachproject.app",
  "workos.com",
  "*.workos.com",
  "authkit.app",
  "*.authkit.app",
  "cloudflare.com",
  "*.cloudflare.com",
  "challenges.cloudflare.com",
  "turnstile.com",
  "*.turnstile.com",
  "google.com",
  "*.google.com",
  "googleapis.com",
  "*.googleapis.com",
  "gstatic.com",
  "*.gstatic.com",
  "googleusercontent.com",
  "*.googleusercontent.com",
  "apple.com",
  "*.apple.com",
  "icloud.com",
  "idmsa.apple.com",
  "appleid.apple.com",
  "microsoftonline.com",
  "*.microsoftonline.com",
  "microsoft.com",
  "*.microsoft.com",
  "live.com",
  "*.live.com",
  "github.com",
  "*.github.com",
  "stripe.com",
  "*.stripe.com",
  "supabase.co",
  "*.supabase.co",
];

module.exports = { CAPACITOR_ALLOW_NAVIGATION_HOSTS };
