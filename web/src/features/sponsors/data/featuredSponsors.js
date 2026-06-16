/**
 * Featured sponsors — offline fallback when `sponsors_catalog` is empty or unreachable.
 * Card hero backgrounds: `/public/sponsors/` (used when DB `background_image_url` is empty).
 */

/** Eduardo Pico Designs monogram (Shopify CDN). */
export const EDUARDO_PICO_DESIGNS_LOGO_URL =
  "https://eduardopicodesigns.com/cdn/shop/files/eduardo_pico_logo.png?v=1775735693&width=240";

/** Gameday Men's Health official horizontal wordmark (franchise brand kit). */
export const GAMEDAY_MENS_HEALTH_LOGO_URL = "/sponsors/gameday-mens-health-wordmark.jpg";

/** Rope Solutions official mark (square PNG, dark-friendly). */
export const ROPE_SOLUTIONS_LOGO_URL = "/sponsors/rope-solutions-logo.png";

/** Apex Global Outdoors — official circular wordmark PNG (card logo slot); hero art is `featured-bg-apex-global-outdoors.png`. */
export const APEX_GLOBAL_OUTDOORS_LOGO_URL = "/sponsors/apex-global-outdoors-logo.png?v=2";

/** Iron Soldiers Coffee Company round emblem — app-hosted PNG. */
export const IRON_SOLDIERS_COFFEE_LOGO_URL = "/sponsors/iron-soldiers-coffee-company-logo.png";

/** The Veterans Veteran — official mark (black field, high-contrast wordmark). */
export const THE_VETERANS_VETERAN_LOGO_URL = "/sponsors/the-veterans-veteran-logo.png";

/** Vet Nav Services — circular compass mark (black on white). */
export const VET_NAV_SERVICES_LOGO_URL = "/sponsors/vetnav-services-logo.png";

/** Green Gorilla Land Management — official wordmark (gglandmanagement.com). */
export const GREEN_GORILLA_LAND_MANAGEMENT_LOGO_URL =
  "/sponsors/green-gorilla-land-management-logo.png?v=2";

/** Rucking Realty Group — circular wordmark (Mike & Natalie Evans, Texas). */
export const RUCKING_REALTY_GROUP_LOGO_URL = "/sponsors/rucking-realty-group-logo.png";

export const FEATURED_SPONSORS = [
  {
    id: "apex-global-outdoors",
    name: "Apex Global Outdoors",
    sponsorType: "mission_partner_sponsor",
    sponsorDisplayGroup: "mission_partner",
    primaryDisplayTag: "Mission Partner Sponsor",
    tag: "Outdoor gear & expedition retail",
    industry: "Outdoor retail",
    tierLabel: "Mission partner",
    subtitle:
      "Curated gear and global outdoor brands for people who train, travel, and serve in demanding environments.",
    longDescription:
      "Apex Global Outdoors is building a mission-aligned outdoor retail experience—pairing trusted equipment with education on preparedness, fieldcraft, and responsible land use. The team partners with The Outreach Project to expand outdoor access for veterans, first responders, and families who rely on dependable kit when conditions turn serious. Official site: apexglobaloutdoors.com.",
    ctaLabel: "Visit Website",
    ctaUrl: "https://apexglobaloutdoors.com/",
    logoUrl: APEX_GLOBAL_OUTDOORS_LOGO_URL,
    warmVariant: "gold",
    backgroundImageUrl: "/sponsors/featured-bg-apex-global-outdoors.png",
    missionPartner: true,
    veteranOwned: false,
    featured: true,
    socialLinks: {},
  },
  {
    id: "gameday-mens-health",
    name: "Gameday Men's Health",
    sponsorType: "mission_partner_sponsor",
    sponsorDisplayGroup: "mission_partner",
    primaryDisplayTag: "Mission Partner Sponsor",
    tag: "Men's health clinics",
    industry: "Men's health",
    tierLabel: "Featured sponsor",
    subtitle:
      "Stone Oak, San Antonio — same-day visits, on-site labs, and physician-guided men’s health care in a private clinic.",
    longDescription:
      "Gameday Men's Health Stone Oak is the San Antonio clinic in the national Gameday network. Patients get same-day scheduling, on-site labs with rapid turnaround, and physician-guided treatment plans across testosterone therapy, weight management, sexual wellness, hair restoration, and recovery support—delivered in a discreet, sports-lounge-style setting built for busy professionals and veterans juggling shift work and family life.",
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
  {
    id: "rope-solutions",
    name: "Rope Solutions",
    sponsorType: "foundational_sponsor",
    sponsorDisplayGroup: "foundational",
    displayName: "",
    internalAlias: "",
    primaryDisplayTag: "Foundational Sponsor",
    tag: "Rope access, rescue & training",
    industry: "Training & readiness",
    tierLabel: "Featured sponsor",
    subtitle:
      "Trusted access. Proven under pressure. Built for teams that don't get second chances.",
    longDescription:
      "Rope Solutions delivers industrial rope access, confined-space rescue, and technical training for teams that work at height and in high-consequence environments. Veteran-led and service-disabled veteran-owned, the company combines field-proven systems with leadership development so crews can plan, communicate, and execute safely when there is no room for error.\n\nFrom vertical mobility to complex rescue scenarios, Rope Solutions equips public safety, industrial, and defense-adjacent organizations with the skills and hardware to operate in unforgiving conditions.",
    ctaLabel: "Visit Website",
    ctaUrl: "https://www.ropesolutions.com/",
    logoUrl: ROPE_SOLUTIONS_LOGO_URL,
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
    id: "the-veterans-veteran",
    name: "The Veterans Veteran",
    sponsorType: "foundational_sponsor",
    sponsorDisplayGroup: "foundational",
    primaryDisplayTag: "Foundational Sponsor",
    tag: "VA disability claims & post-service coaching",
    industry: "Veteran benefits consulting",
    tierLabel: "Foundational sponsor",
    subtitle:
      "Veteran-led guidance through VA disability claims, ratings, appeals, GI Bill planning, and post-service transition—so you do not navigate the system alone.",
    longDescription:
      "The Veterans Veteran, founded and led by Drew Jones, helps veterans move through the VA disability and benefits process with clarity and advocacy. The team provides educational and administrative support—not legal representation—including claims and ratings review, medical evidence organization, appeals guidance, and GI Bill maximization. Post-service coaching helps veterans set career goals and build a roadmap after the uniform. Fellow service members built this practice after walking the same transition; the mission is to ensure veterans understand their options and receive the benefits they earned.",
    ctaLabel: "Visit Website",
    ctaUrl: "https://thevetsvet.com/",
    logoUrl: THE_VETERANS_VETERAN_LOGO_URL,
    warmVariant: "rose",
    backgroundImageUrl: "/sponsors/featured-bg-the-veterans-veteran.png",
    missionPartner: true,
    veteranOwned: true,
    featured: true,
    socialLinks: {},
  },
  {
    id: "rucking-realty-group",
    name: "Rucking Realty Group",
    sponsorType: "impact_sponsor",
    sponsorDisplayGroup: "impact",
    primaryDisplayTag: "Impact Sponsor",
    tag: "Texas residential real estate",
    industry: "Real estate",
    tierLabel: "Featured sponsor",
    subtitle:
      "Mike & Natalie Evans — Marine-led, family-first Realtors helping clients buy, sell, rent, and invest across Texas.",
    longDescription:
      "Rucking Realty Group is led by Mike and Natalie Evans, a husband-and-wife team based near San Antonio. Mike served as a United States Marine Corps infantry Marine (2005–2009) and carries that discipline into every transaction; Natalie brings a decade of HR leadership and a calm, people-first style that keeps complex deals on track. Together they serve Military City USA and communities statewide with honest pricing guidance, proactive communication, and extra care for military families, first-time buyers, and folks navigating life transitions.",
    ctaLabel: "Visit Website",
    ctaUrl: "https://ruckingrealtygroup.com/",
    logoUrl: RUCKING_REALTY_GROUP_LOGO_URL,
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
    id: "iron-soldiers-coffee-company",
    name: "Iron Soldiers Coffee Company",
    sponsorType: "impact_sponsor",
    sponsorDisplayGroup: "impact",
    primaryDisplayTag: "Impact Sponsor",
    tag: "Veteran-owned coffee roaster",
    industry: "Food & beverage",
    tierLabel: "Impact sponsor",
    subtitle: "Small-batch roasts, wholesale programs, and retail for crews who live on coffee between missions.",
    longDescription:
      "Iron Soldiers Coffee Company is a veteran-owned specialty roaster focused on bold, consistent profiles for shift workers, athletes, and community fundraisers. Beans are roasted in small batches with transparent sourcing so wholesale partners, nonprofits, and local retailers can serve cups that taste as intentional as the mission behind the brand.",
    ctaLabel: "Visit Website",
    ctaUrl: "https://www.ironsoldierscoffee.com/",
    logoUrl: IRON_SOLDIERS_COFFEE_LOGO_URL,
    warmVariant: "amber",
    backgroundImageUrl: "/sponsors/featured-bg-iron-soldiers-coffee-company.png",
    missionPartner: false,
    veteranOwned: true,
    featured: true,
    socialLinks: {},
  },
  {
    id: "vetnav-services",
    name: "Vet Nav Services",
    sponsorType: "impact_sponsor",
    sponsorDisplayGroup: "impact",
    primaryDisplayTag: "Impact Sponsor",
    tag: "Veteran benefits & resource navigation",
    industry: "Veteran services",
    tierLabel: "Impact sponsor",
    subtitle:
      "Human navigation that sequences VA benefits, healthcare, employment, and community programs without the runaround.",
    longDescription:
      "Vet Nav Services pairs veterans and military families with navigators who speak the language of DD-214s, disability claims, vocational rehab, and local aid networks. The focus is practical sequencing—what to file first, which clinic or VSO can help, and how to avoid dead ends—so people spend less time searching portals and more time moving toward stable housing, healthcare, and work.",
    ctaLabel: "Website pending verification",
    ctaUrl: "",
    logoUrl: VET_NAV_SERVICES_LOGO_URL,
    warmVariant: "gold",
    backgroundImageUrl: "/sponsors/featured-bg-vetnav-services.png",
    missionPartner: false,
    veteranOwned: true,
    featured: true,
    socialLinks: {},
  },
  {
    id: "eduardo-pico-designs",
    name: "Eduardo Pico Designs",
    sponsorType: "community_sponsor",
    sponsorDisplayGroup: "community",
    primaryDisplayTag: "Community Sponsor",
    tag: "Laser engraving & CNC fabrication",
    industry: "Design & fabrication",
    tierLabel: "Featured sponsor",
    subtitle:
      "Veteran-owned Texas studio for awards, signage, drinkware, and bespoke shop projects with museum-grade finishing.",
    longDescription:
      "Eduardo Pico Designs is a veteran-owned laser and CNC studio outside San Antonio, Texas. The team produces everything from personalized tumblers and ranch-style door hangers to unit coins, nonprofit gala awards, and full custom shop fit-outs. Expect collaborative proofs, disciplined timelines, and finishes that hold up to Texas heat, humidity, and the scrutiny of clients who care about detail.",
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
    id: "green-gorilla-land-management",
    name: "Green Gorilla Land Management",
    sponsorType: "community_sponsor",
    sponsorDisplayGroup: "community",
    primaryDisplayTag: "Community Sponsor",
    tag: "Forestry mulching & land clearing",
    industry: "Land management",
    tierLabel: "Community sponsor",
    subtitle:
      "Charleston, SC–based crew for forestry mulching, brush clearing, storm cleanup, and large-lot mowing with daily field reporting.",
    longDescription:
      "Green Gorilla Land Management is a veteran-owned land services contractor serving Charleston, the South Carolina Lowcountry, and nearby coastal counties. Services include forestry mulching, selective clearing, bush hogging, storm debris removal, and pre-sale property cleanup. Crews document progress with photos, stick to agreed scopes, and prioritize ecological balance so residential, commercial, and nonprofit partners can put land back to work safely.",
    ctaLabel: "Visit Website",
    ctaUrl: "https://gglandmanagement.com/",
    logoUrl: GREEN_GORILLA_LAND_MANAGEMENT_LOGO_URL,
    warmVariant: "gold",
    backgroundImageUrl: "/sponsors/featured-bg-green-gorilla-land-management.png",
    missionPartner: false,
    veteranOwned: true,
    featured: true,
    socialLinks: {},
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
