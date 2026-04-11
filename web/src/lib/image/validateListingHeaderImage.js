import { readImageDimensions } from "@/lib/image/readImageDimensions";

/**
 * Reject assets that are clearly favicons/logos or unusable geometry for a wide listing-card hero strip.
 * @param {Buffer} buf
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateOrgListingHeaderImageBuffer(buf) {
  if (!buf || buf.length < 400) return { ok: false, reason: "too_small_bytes" };

  const dim = readImageDimensions(buf);
  if (!dim) return { ok: false, reason: "unknown_format_or_corrupt" };

  const r = dim.w / dim.h;
  const shortSide = Math.min(dim.w, dim.h);
  const longSide = Math.max(dim.w, dim.h);

  // Small square → app icon / logo, not a hero strip image
  if (r >= 0.88 && r <= 1.14 && shortSide < 560) {
    return { ok: false, reason: "square_icon_not_listing_hero" };
  }

  if (r < 0.34) return { ok: false, reason: "aspect_too_tall" };
  if (shortSide < 240) return { ok: false, reason: "resolution_too_low" };
  if (longSide > 4500) return { ok: false, reason: "resolution_too_large" };

  return { ok: true };
}
