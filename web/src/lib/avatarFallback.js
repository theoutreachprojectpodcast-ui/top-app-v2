/**
 * Deterministic placeholder avatars when the user has no photo.
 * Uses cropped portrait photography (Unsplash) — same licensing approach as communitySeed.
 * Renders via <img>; no Next/Image remote config required.
 */

/** Unsplash portrait slugs (photography, face-cropped) — URLs verified via HEAD. */
const UNSPLASH_PORTRAIT_SLUGS = [
  "photo-1573496359142-b8d87734a5a2",
  "photo-1500648767791-00dcc994a43e",
  "photo-1580489944761-15a19d654956",
  "photo-1506794778202-cad84cf45f1d",
  "photo-1438761681033-6461ffad8d80",
  "photo-1472099645785-5658abf4ff4e",
  "photo-1544723795-3fb6469f5b39",
  "photo-1531746020798-e6953c6e8e04",
  "photo-1492562080023-ab3db95bfbce",
  "photo-1519345182560-3f2917c472ef",
  "photo-1534528741775-53994a69daeb",
  "photo-1507003211169-0a1dd7228f2d",
  "photo-1494790108377-be9c29b29330",
  "photo-1544005313-94ddf0286df2",
  "photo-1560250097-0b93528c311a",
  "photo-1488426862026-3ee34a7d66df",
  "photo-1524504388940-b1c1722653e1",
  "photo-1487412720507-e7ab37603c6f",
  "photo-1607746882042-944635dfe10e",
  "photo-1551836022-d5d88e9218df",
  "photo-1570295999919-56ceb5ecca61",
  "photo-1612349317150-e413f6a5b16d",
  "photo-1552374196-c4e7ffc6e126",
];

function hashSeed(seed) {
  const s = String(seed || "user");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

function portraitCropUrl(slug) {
  return `https://images.unsplash.com/${slug}?auto=format&w=384&h=384&fit=crop&crop=faces&q=82`;
}

/**
 * @param {string} [seed] — stable id (user id, member id, etc.) picks a consistent portrait
 * @returns {string}
 */
export function avatarFallbackUrl(seed = "user") {
  const h = hashSeed(seed);
  const slug = UNSPLASH_PORTRAIT_SLUGS[h % UNSPLASH_PORTRAIT_SLUGS.length];
  return portraitCropUrl(slug);
}
