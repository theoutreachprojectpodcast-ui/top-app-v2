/**
 * App Store / Play Store URLs for the TOP mobile app (Capacitor shell).
 * Set when listings are live; until then the download button links to /mobile.
 */
export const IOS_APP_STORE_URL = String(process.env.NEXT_PUBLIC_IOS_APP_STORE_URL || "").trim();
export const ANDROID_PLAY_STORE_URL = String(process.env.NEXT_PUBLIC_ANDROID_PLAY_STORE_URL || "").trim();

export function hasPublishedStoreLinks() {
  return !!(IOS_APP_STORE_URL || ANDROID_PLAY_STORE_URL);
}

/**
 * Best store URL for the current browser, or `/mobile` landing when unknown / pre-launch.
 * @param {string | undefined} userAgent
 */
export function resolveMobileDownloadHref(userAgent) {
  const ua = String(userAgent || "");
  if (/iPhone|iPad|iPod/i.test(ua) && IOS_APP_STORE_URL) return IOS_APP_STORE_URL;
  if (/Android/i.test(ua) && ANDROID_PLAY_STORE_URL) return ANDROID_PLAY_STORE_URL;
  if (IOS_APP_STORE_URL && !ANDROID_PLAY_STORE_URL) return IOS_APP_STORE_URL;
  if (ANDROID_PLAY_STORE_URL && !IOS_APP_STORE_URL) return ANDROID_PLAY_STORE_URL;
  return "/mobile";
}
