/**
 * Featured sponsors — offline fallback when `sponsors_catalog` is empty or unreachable.
 * Card hero backgrounds: `/public/sponsors/` (used when DB `background_image_url` is empty).
 */

/** Official War's End wordmark (brand-provided asset on Squarespace CDN). */
export const WARS_END_OFFICIAL_LOGO_URL =
  "https://images.squarespace-cdn.com/content/v1/6959573fd567e738e7c613f3/cfd220a6-7daf-4845-8d83-fdb8c2ffa128/ChatGPT+Image+Jan+7%2C+2026%2C+08_37_51+PM.png?format=2500w";

/** Eduardo Pico Designs monogram (Shopify CDN). */
export const EDUARDO_PICO_DESIGNS_LOGO_URL =
  "https://eduardopicodesigns.com/cdn/shop/files/eduardo_pico_logo.png?v=1775735693&width=240";

/** Gameday Men's Health wordmark (red/black on white) — app-hosted asset. */
export const GAMEDAY_MENS_HEALTH_LOGO_URL = "/sponsors/gameday-mens-health-logo.png";

export const FEATURED_SPONSORS = [
  {
    id: "rope-solutions",
    name: "Rope Solutions",
    displayName: "",
    internalAlias: "",
    primaryDisplayTag: "Foundational Sponsor",
    tag: "Training & readiness",
    industry: "Training & Readiness",
    tierLabel: "Featured sponsor",
    subtitle:
      "Trusted access. Proven under pressure. Built for teams that don't get second chances.",
    longDescription:
      "Rope Solutions delivers elite rope access, rescue systems, and technical training for high-consequence operational teams. Veteran-led and service-disabled veteran-owned, the team focuses on leadership, high-performing teams, and strategy under pressure — equipping professionals who need precision, safety, and confidence in unforgiving environments.\n\nFrom vertical mobility to complex rescue scenarios, Rope Solutions provides the systems and skills to operate when conditions are at their worst.",
    ctaLabel: "Visit Website",
    ctaUrl: "https://www.ropesolutions.com/",
    logoUrl: null,
    warmVariant: "gold",
    backgroundImageUrl: "/sponsors/featured-bg-rope-solutions.png",
    missionPartner: true,
    veteranOwned: true,
    featured: true,
    socialLinks: {
      linkedin: "https://www.linkedin.com/company/rope-solutions-llc/",
      instagram: "https://www.instagram.com/ropesolutionsofficial/",
      facebook: "https://www.facebook.com/ROPESolutionsLLC",
    },
  },
  {
    id: "rucking-realty-group",
    name: "Rucking Realty Group",
    primaryDisplayTag: "Foundational Sponsor",
    tag: "Texas real estate",
    industry: "Real estate",
    tierLabel: "Featured sponsor",
    subtitle:
      "Mike and Natalie Evans — husband-and-wife Realtors helping clients buy and sell in San Antonio with integrity.",
    longDescription:
      "Rucking Realty Group is led by Mike and Natalie Evans — a husband-and-wife real estate team rooted in service and family. Mike is a United States Marine Corps veteran; together they help clients buy, sell, rent, and invest with honesty, integrity, and steady communication. They proudly serve the greater San Antonio area and communities across Texas, with a special heart for military families and those navigating life transitions.",
    ctaLabel: "Visit Website",
    ctaUrl: "https://ruckingrealtygroup.com/",
    logoUrl: null,
    warmVariant: "amber",
    backgroundImageUrl: "/sponsors/featured-bg-rucking-realty.png",
    missionPartner: true,
    veteranOwned: true,
    featured: true,
    socialLinks: {
      instagram: "https://www.instagram.com/rucking.realty.groupllc/",
      facebook: "https://www.facebook.com/61579340832737",
    },
  },
  {
    id: "eduardo-pico-designs",
    name: "Eduardo Pico Designs",
    primaryDisplayTag: "Foundational Sponsor",
    tag: "Veteran-made custom builds",
    industry: "Design & fabrication",
    tierLabel: "Featured sponsor",
    subtitle:
      "Veteran-owned laser & CNC studio — home décor, signs, tumblers, military awards, and custom builds.",
    longDescription:
      "Eduardo Pico Designs is a veteran-owned Texas studio specializing in laser engraving and CNC work — from drinkware and door hangers to custom awards and business-branded products. Each piece is built with craftsmanship, clarity, and pride, supporting mission-driven causes and local nonprofit partners across the community.",
    ctaLabel: "Visit Website",
    ctaUrl: "https://eduardopicodesigns.com/",
    logoUrl: EDUARDO_PICO_DESIGNS_LOGO_URL,
    warmVariant: "copper",
    backgroundImageUrl: "/sponsors/featured-bg-eduardo-pico-designs.png",
    missionPartner: true,
    veteranOwned: true,
    featured: true,
    socialLinks: {
      instagram: "https://www.instagram.com/eduardopicodesigns/",
      facebook: "https://www.facebook.com/EduardoPicoDesigns/",
    },
  },
  {
    id: "wars-end-merch",
    name: "War's End",
    displayName: "War's End",
    internalAlias:
      "Legacy listing titles may have referenced Warzone Veteran or War's End Veteran Owned and Operated; public name: War's End.",
    primaryDisplayTag: "Foundational Sponsor",
    tag: "Veteran-owned woodworking & flags",
    industry: "Woodworking",
    tierLabel: "Featured sponsor",
    subtitle:
      "Handmade American flags and woodworking from a veteran-owned shop in Texas — honoring service through craft.",
    longDescription:
      "War's End is veteran-owned, creating handmade American flags and custom woodworking from Texas. Each piece is built with care to honor service, recovery, and resilience, with proceeds supporting veteran-focused nonprofit partners.",
    ctaLabel: "Visit website",
    ctaUrl: "https://www.warsendmerch.com/",
    logoUrl: WARS_END_OFFICIAL_LOGO_URL,
    warmVariant: "rose",
    backgroundImageUrl: "/sponsors/featured-bg-wars-end-merch.png",
    missionPartner: true,
    veteranOwned: true,
    featured: true,
    socialLinks: {
      instagram: "https://www.instagram.com/wars__end/",
    },
  },
  {
    id: "gameday-mens-health",
    name: "Gameday Men's Health",
    primaryDisplayTag: "Foundational Sponsor",
    tag: "Men's health clinics",
    industry: "Men's health",
    tierLabel: "Featured sponsor",
    subtitle:
      "Stone Oak, San Antonio — same-day visits, on-site labs, and physician-guided men’s health care.",
    longDescription:
      "Gameday Men's Health Stone Oak delivers fast, decisive men's health care in San Antonio: same-day appointments, on-site lab testing with rapid turnaround, and physician-guided plans spanning testosterone therapy, weight management, sexual wellness, hair loss, and recovery support — in a private, sports-lounge-style clinic.",
    ctaLabel: "Visit Website",
    ctaUrl: "https://gamedaymenshealth.com/stone-oak/",
    logoUrl: GAMEDAY_MENS_HEALTH_LOGO_URL,
    warmVariant: "rust",
    backgroundImageUrl: "/sponsors/featured-bg-gameday-mens-health.png",
    missionPartner: true,
    veteranOwned: false,
    featured: true,
    socialLinks: {
      instagram: "https://www.instagram.com/gameday_stone_oak/",
    },
  },
];

/** Default hero art by sponsor slug/id when `sponsors_catalog.background_image_url` is empty. */
export const FEATURED_SPONSOR_CARD_BACKGROUNDS = (() => {
  const map = Object.fromEntries(
    FEATURED_SPONSORS.map((s) => [String(s.id || "").trim(), String(s.backgroundImageUrl || "").trim()]).filter(
      ([, url]) => url,
    ),
  );
  return map;
})();
