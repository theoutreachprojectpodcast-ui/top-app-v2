/**
 * Share integration boundary — community posts / stories.
 * Wire to Web Share API, copy-link, UTM builder, and analytics when product is ready.
 */

/**
 * @param {{ postId: string, title?: string, path?: string }} ctx
 * @param {{ baseUrl?: string }} env
 */
export function buildCommunityShareUrl(ctx, env = {}) {
  const base =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : String(env.baseUrl || "").replace(/\/$/, "");
  const path = ctx.path || `/community?story=${encodeURIComponent(ctx.postId)}`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * @param {{ postId: string, title?: string, summary?: string }} ctx
 * @returns {Promise<{ channel: string, ok: boolean }>}
 */
export async function shareCommunityPostNative(ctx) {
  const url = buildCommunityShareUrl(ctx);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: ctx.title || "Community story — The Outreach Project",
        text: ctx.summary || "",
        url,
      });
      return { channel: "native", ok: true };
    } catch {
      return { channel: "native", ok: false };
    }
  }
  return { channel: "unavailable", ok: false };
}

/**
 * Analytics hook placeholder — call from UI after successful share/copy.
 * @param {{ event: string, postId: string, channel?: string }} payload
 */
export function trackCommunityShareEvent(payload) {
  if (typeof window !== "undefined" && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent("torp:community-share", { detail: payload }));
  }
}
