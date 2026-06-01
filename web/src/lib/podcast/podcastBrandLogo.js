/** Full-color mark on dark podcast chrome (transparent art). */
export const PODCAST_BRAND_LOGO_DARK = "/podcast-logo-transparent.png";

/** Full mark on black field — reads on light podcast chrome. */
export const PODCAST_BRAND_LOGO_LIGHT = "/podcast-logo.png";

/**
 * @param {"light" | "dark" | string | undefined} colorScheme
 * @returns {string}
 */
export function resolvePodcastBrandLogoSrc(_colorScheme) {
  const env =
    typeof process !== "undefined" ? String(process.env.NEXT_PUBLIC_PODCAST_BRAND_LOGO_PATH || "").trim() : "";
  if (env) return env;
  return PODCAST_BRAND_LOGO_DARK;
}
