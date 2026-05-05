/**
 * Featured sponsors — offline fallback when `sponsors_catalog` is empty or unreachable.
 * Logos are null here; use moderator logo enrichment + Supabase for real brand assets.
 * Card hero backgrounds: static files under `/public/sponsors/` (used when DB `background_image_url` is empty).
 */

export const FEATURED_SPONSORS = [
  {
    id: "rope-solutions",
    name: "Rope Solutions",
    tag: "Mission partner",
    industry: "Training & readiness",
    tierLabel: "Featured sponsor",
    tagline: "Trusted rope access and technical training for high-consequence teams.",
    ctaLabel: "Website pending approval",
    ctaUrl: null,
    websitePending: true,
    logoUrl: null,
    warmVariant: "gold",
    backgroundImageUrl: "/sponsors/featured-bg-rope-solutions.png",
    socialLinks: {},
  },
  {
    id: "gameday-mens-health",
    name: "Gameday Men’s Health",
    tag: "Men’s wellness",
    industry: "Men’s health clinics",
    tierLabel: "Featured sponsor",
    tagline: "Men’s health clinics focused on testosterone therapy, vitality, and proactive care.",
    ctaLabel: "Visit website",
    ctaUrl: "https://gamedaymenshealth.com/",
    logoUrl: null,
    warmVariant: "copper",
    backgroundImageUrl: "/sponsors/featured-bg-gameday-mens-health.png",
    socialLinks: {
      website: "https://gamedaymenshealth.com/",
      instagram: "https://www.instagram.com/gamedaymenshealth/",
      facebook: "https://www.facebook.com/gamedaymenshealth",
      linkedin: "https://www.linkedin.com/company/gameday-mens-health",
    },
  },
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
    id: "the-veterans-veteran",
    name: "The Veteran’s Veteran",
    tag: "Foundational sponsor",
    industry: "Veteran support",
    tierLabel: "Foundational sponsor",
    tagline: "Veteran-led support and advocacy focused on service-connected community outcomes.",
    ctaLabel: "Website pending approval",
    ctaUrl: null,
    logoUrl: null,
    warmVariant: "sage",
    backgroundImageUrl: "",
    socialLinks: {},
  },
];

/** Default hero art by sponsor slug/id when `sponsors_catalog.background_image_url` is empty. */
export const FEATURED_SPONSOR_CARD_BACKGROUNDS = Object.fromEntries(
  FEATURED_SPONSORS.map((s) => [String(s.id || "").trim(), String(s.backgroundImageUrl || "").trim()]).filter(
    ([, url]) => url,
  ),
);
