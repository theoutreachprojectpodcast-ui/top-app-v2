/**
 * Featured sponsors — offline fallback when `sponsors_catalog` is empty or unreachable.
 * Card hero backgrounds: `/public/sponsors/` (used when DB `background_image_url` is empty).
 *
 * Brain Treatment Center NoVA / Alexandria / Ashburn are represented as **one** foundational card
 * with location chips (matches public messaging as a single regional brand).
 */

/** Official War's End wordmark (brand-provided asset on Squarespace CDN). */
export const WARS_END_OFFICIAL_LOGO_URL =
  "https://images.squarespace-cdn.com/content/v1/6959573fd567e738e7c613f3/cfd220a6-7daf-4845-8d83-fdb8c2ffa128/ChatGPT+Image+Jan+7%2C+2026%2C+08_37_51+PM.png?format=2500w";

export const FEATURED_SPONSORS = [
  {
    id: "rope-solutions",
    name: "Rope Solutions",
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
    tag: "Texas real estate",
    industry: "Real estate",
    tierLabel: "Featured sponsor",
    subtitle: "Mike & Natalie Evans — husband-and-wife team serving San Antonio and surrounding Texas communities.",
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
    socialLinks: {},
  },
  {
    id: "eduardo-pico-designs",
    name: "Eduardo Pico Designs",
    tag: "Veteran-made custom builds",
    industry: "Design & fabrication",
    tierLabel: "Featured sponsor",
    subtitle: "Veteran-owned laser & CNC studio crafting personalized home décor, awards, and branded products.",
    longDescription:
      "Eduardo Pico Designs is a veteran-owned Texas studio specializing in laser engraving and CNC work — from drinkware and door hangers to custom awards and business-branded products. Each piece is built with craftsmanship, clarity, and pride, supporting mission-driven causes and local nonprofit partners across the community.",
    ctaLabel: "Visit Website",
    ctaUrl: "https://eduardopicodesigns.com/",
    logoUrl: null,
    warmVariant: "copper",
    backgroundImageUrl: "/sponsors/featured-bg-eduardo-pico-designs.png",
    missionPartner: true,
    veteranOwned: true,
    featured: true,
    socialLinks: {},
  },
  {
    id: "wars-end-merch",
    name: "War's End Veteran Owned and Operated",
    tag: "Veteran-owned woodworking & apparel",
    industry: "Woodworking & apparel",
    tierLabel: "Featured sponsor",
    subtitle:
      "Custom woodworking, flags, and apparel from a veteran-led brand — proceeds support veteran nonprofits.",
    longDescription:
      "War's End LLC is veteran-owned and operated, founded after 20 years of military service to bridge operational experience with a passion for the nonprofit and outreach community. The team produces custom woodworking — including hand-carved American flags, coin racks, boards, and serving pieces — alongside apparel and goods that honor service, recovery, and resilience.\n\nA portion of every purchase supports veteran-focused nonprofits and initiatives (including partners such as Freedom Alliance, Frontline Healing Foundation, and Hometown Hero Outdoors) dedicated to combating veteran suicide and expanding opportunities for veterans and their families.",
    ctaLabel: "Visit website",
    ctaUrl: "https://www.warsendmerch.com/",
    logoUrl: WARS_END_OFFICIAL_LOGO_URL,
    warmVariant: "rose",
    backgroundImageUrl: "/sponsors/featured-bg-wars-end-merch.png",
    missionPartner: true,
    veteranOwned: true,
    featured: true,
    socialLinks: {},
  },
  {
    id: "brain-treatment-center-nova",
    name: "Brain Treatment Center — Northern Virginia",
    tag: "Integrative brain & functional health",
    industry: "Health & wellness",
    tierLabel: "Featured sponsor",
    subtitle: "MeRT and integrative care for veterans, first responders, autism families, and complex brain health needs.",
    longDescription:
      "Brain Treatment Center Northern Virginia delivers integrative brain and functional health care — including MeRT (Magnetic e-Resonance Therapy), psychiatry, hyperbaric oxygen therapy, occupational therapy, nutrition, and related services. Veteran-owned and operated, the team serves the National Capital Region with clinics in Alexandria and Ashburn, supporting PTSD, TBI, autism spectrum, depression, anxiety, cognitive recovery, and sports-related brain health with a compassionate, measurement-guided approach.",
    ctaLabel: "Visit Website",
    ctaUrl: "https://www.braintreatmentcenterashburn.com/",
    logoUrl: "/sponsors/brain-treatment-center-logo.svg",
    warmVariant: "teal",
    backgroundImageUrl: "/sponsors/featured-bg-brain-treatment-center.png",
    missionPartner: true,
    veteranOwned: true,
    featured: true,
    socialLinks: {
      instagram: "https://www.instagram.com/braintreatmentcenter_ashburn/",
    },
  },
];

/** Default hero art by sponsor slug/id when `sponsors_catalog.background_image_url` is empty. */
export const FEATURED_SPONSOR_CARD_BACKGROUNDS = Object.fromEntries(
  FEATURED_SPONSORS.map((s) => [String(s.id || "").trim(), String(s.backgroundImageUrl || "").trim()]).filter(
    ([, url]) => url,
  ),
);
