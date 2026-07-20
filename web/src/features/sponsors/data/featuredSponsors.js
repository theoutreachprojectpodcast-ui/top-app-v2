/**
 * Featured sponsors — offline fallback when `sponsors_catalog` is empty or unreachable.
 * Card hero backgrounds: `/public/sponsors/` (used when DB `background_image_url` is empty).
 */

/** Eduardo Pico Designs monogram (Shopify CDN). */
export const EDUARDO_PICO_DESIGNS_LOGO_URL =
  "https://eduardopicodesigns.com/cdn/shop/files/eduardo_pico_logo.png?v=1775735693&width=240";

/** Gameday Men's Health official horizontal wordmark (franchise brand kit). */
export const GAMEDAY_MENS_HEALTH_LOGO_URL = "/sponsors/gameday-mens-health-wordmark.jpg";

/** ROPE Solutions official mark (square PNG, dark-friendly). */
export const ROPE_SOLUTIONS_LOGO_URL = "/sponsors/rope-solutions-logo.png?v=4";

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

/** Rucking Realty Group — official badge mark (Mike & Natalie Evans, Texas). */
export const RUCKING_REALTY_GROUP_LOGO_URL = "/sponsors/rucking-realty-group-logo.png?v=3";

/** Don Blas Cigars — circular badge mark on white (veteran-owned premium cigars). */
export const DON_BLAS_CIGARS_LOGO_URL = "/sponsors/don-blas-cigars-logo.png?v=1";

export const FEATURED_SPONSORS = [
  {
    id: "apex-global-outdoors",
    name: "Apex Global Outdoors",
    sponsorType: "mission_partner_sponsor",
    sponsorDisplayGroup: "mission_partner",
    primaryDisplayTag: "Mission Partner Sponsor",
    tag: "Global Hunting Agent",
    industry: "Global Hunting Agent",
    tierLabel: "Mission partner",
    subtitle:
      "Apex Global Outdoors is a retired LEO-owned hunting & fishing booking agency offering only personally vetted locations to ensure world-class outdoor adventures.",
    longDescription:
      "Our mission is simple: To deliver expertly planned trips, exceptional accommodations, harvests led by the world's leading outfitters, and vacations that will become core memories for you and your family.",
    ctaLabel: "Visit Website",
    ctaUrl: "https://apexglobaloutdoors.com/",
    logoUrl: APEX_GLOBAL_OUTDOORS_LOGO_URL,
    warmVariant: "gold",
    backgroundImageUrl: "/sponsors/featured-bg-apex-global-outdoors.png",
    missionPartner: true,
    veteranOwned: false,
    featured: true,
    socialLinks: {
      instagram: "https://www.instagram.com/apex_global_outdoors/",
      facebook: "https://www.facebook.com/apexglobaloutdoors",
      youtube: "https://www.youtube.com/channel/UCW6eRLm7RTo8_iqcem6AweA",
    },
  },
  {
    id: "gameday-mens-health",
    name: "Gameday Men's Health",
    sponsorType: "mission_partner_sponsor",
    sponsorDisplayGroup: "mission_partner",
    primaryDisplayTag: "Mission Partner Sponsor",
    tag: "Men's & Women's Wellness",
    industry: "Men's & Women's Wellness",
    tierLabel: "Featured sponsor",
    tagline:
      "San Antonio — same-day visits, on-site labs, and physician-guided men's & Women's health care in a private clinic.",
    subtitle:
      "San Antonio — same-day visits, on-site labs, and physician-guided men's & Women's health care in a private clinic.",
    longDescription:
      "Patients get same-day scheduling, on-site labs with rapid turnaround, and physician-guided treatment plans across testosterone therapy, weight management, sexual wellness, hair restoration, and recovery support.",
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
    name: "ROPE Solutions",
    sponsorType: "foundational_sponsor",
    sponsorDisplayGroup: "foundational",
    displayName: "",
    internalAlias: "",
    primaryDisplayTag: "Foundational Sponsor",
    tag: "Elite Leadership Coaching",
    industry: "Elite Leadership Coaching",
    tierLabel: "Featured sponsor",
    subtitle: "Leadership Development where it matters most: on the front lines of your operation.",
    longDescription:
      "ROPE Solutions embeds with your organization to build elite leaders, high-performing teams, and strategies that hold up when the pressure is real, closing the gap between leadership training and leadership that actually performs.",
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
    sponsorType: "foundational_sponsor",
    sponsorDisplayGroup: "foundational",
    primaryDisplayTag: "Foundational Sponsor",
    tag: "Veteran-owned coffee roaster",
    industry: "Food & beverage",
    tierLabel: "Foundational sponsor",
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
    ctaLabel: "Visit Website",
    ctaUrl: "https://www.vetnavservices.com/about",
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
    tag: "Woodworking & custom fabrication",
    industry: "Woodworking & custom fabrication",
    tierLabel: "Featured sponsor",
    subtitle:
      "Eduardo Pico Designs is a veteran-owned woodworking and custom fabrication studio serving San Antonio and beyond. Woodworking is at the heart of everything we build, with CNC routing, laser engraving, and UV printing allowing us to create premium custom pieces that stand out.",
    longDescription:
      "We specialize in business branding, custom signs, military and nonprofit awards, golf tournament merchandise, whiskey and cigar accessories, personalized gifts, vendor displays, and home décor. Every project is designed with a focus on quality craftsmanship, clean design, and products that people are proud to display, use, or give as gifts.",
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
  {
    id: "don-blas-cigars",
    name: "Don Blas Cigars",
    sponsorType: "community_sponsor",
    sponsorDisplayGroup: "community",
    primaryDisplayTag: "Community Sponsor",
    tag: "Premium Aged Cigars",
    industry: "Premium cigars",
    tierLabel: "Community sponsor",
    subtitle: "Tune Out & Light Up",
    tagline: "Tune Out & Light Up",
    longDescription:
      "Don Blas is more than a premium cigar company—it's a business built on service, craftsmanship, and community. As a Veteran-Owned company that is also owned and operated by an active-duty service member, Don Blas understands firsthand the values of commitment, sacrifice, and brotherhood that unite our military community.\n\nEvery handcrafted cigar reflects a dedication to quality, tradition, and bringing people together. Whether you're celebrating life's victories, sharing stories with friends, or simply taking a moment to slow down, Don Blas is about creating experiences that matter.",
    ctaLabel: "Follow on Instagram",
    ctaUrl: "https://www.instagram.com/db_premiumcigars/",
    logoUrl: DON_BLAS_CIGARS_LOGO_URL,
    warmVariant: "amber",
    backgroundImageUrl: "",
    missionPartner: false,
    veteranOwned: true,
    featured: true,
    socialLinks: {
      instagram: "https://www.instagram.com/db_premiumcigars/",
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
