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
  {
    id: "rope-solutions",
    name: "Rope Solutions",
    tag: "Mission partner",
    industry: "Training & Readiness",
    tierLabel: "Featured sponsor",
    subtitle:
      "Trusted access. Proven under pressure. Built for teams that don’t get second chances.",
    longDescription:
      "Rope Solutions delivers elite rope access, rescue systems, and technical training for high-consequence operational teams. Their work supports professionals who need precision, safety, and confidence in unforgiving environments.\n\nFrom vertical mobility to complex rescue scenarios, Rope Solutions equips teams with the systems and skills needed to operate when conditions are at their worst.",
    ctaLabel: "Visit Website",
    ctaUrl: "https://www.ropesolutions.com/",
    logoUrl: null,
    warmVariant: "gold",
    backgroundImageUrl: "/sponsors/featured-bg-rope-solutions.png",
    missionPartner: true,
    socialLinks: {
      linkedin: "https://www.linkedin.com/company/rope-solutions-llc/",
      instagram: "https://www.instagram.com/ropesolutionsofficial/",
      facebook: "https://www.facebook.com/ROPESolutionsLLC",
    },
  },
];

/** Default hero art by sponsor slug/id when `sponsors_catalog.background_image_url` is empty. */
export const FEATURED_SPONSOR_CARD_BACKGROUNDS = Object.fromEntries(
  FEATURED_SPONSORS.map((s) => [String(s.id || "").trim(), String(s.backgroundImageUrl || "").trim()]).filter(
    ([, url]) => url,
  ),
);
