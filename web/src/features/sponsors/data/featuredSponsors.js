/**
 * Featured sponsors — offline fallback when `sponsors_catalog` is empty or unreachable.
 * Logos are null here; use moderator logo enrichment + Supabase for real brand assets.
 * Card hero backgrounds: static files under `/public/sponsors/` (used when DB `background_image_url` is empty).
 */

export const FEATURED_SPONSORS = [
  {
    id: "wars-end-merch",
    name: "War’s End Merch",
    tag: "Apparel & impact",
    industry: "Apparel",
    tierLabel: "Mission retail",
    tagline: "Apparel and goods that amplify stories of service, recovery, and resilience.",
    ctaLabel: "Visit website",
    ctaUrl: "https://www.warsendmerch.com/",
    logoUrl: null,
    warmVariant: "rose",
    backgroundImageUrl: "/sponsors/featured-bg-wars-end-merch.png",
    socialLinks: {},
  },
];

/** Default hero art by sponsor slug/id when `sponsors_catalog.background_image_url` is empty. */
export const FEATURED_SPONSOR_CARD_BACKGROUNDS = Object.fromEntries(
  FEATURED_SPONSORS.map((s) => [String(s.id || "").trim(), String(s.backgroundImageUrl || "").trim()]).filter(
    ([, url]) => url,
  ),
);
