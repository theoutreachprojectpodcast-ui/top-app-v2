/**
 * Featured sponsors — logos via Clearbit where a public domain exists; background imagery is category-aligned to each sponsor profile.
 * Social URLs are public marketing links only; verify before production campaigns.
 */

function unsplash(photoPath, w = 1400) {
  return `https://images.unsplash.com/${photoPath}?auto=format&fit=crop&w=${w}&q=78`;
}

function clearbitLogo(domain) {
  return `https://logo.clearbit.com/${domain}`;
}

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
    backgroundImageUrl: unsplash("photo-1581092921461-7d65ca45f8aa"),
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
    logoUrl: clearbitLogo("gamedaymenshealth.com"),
    warmVariant: "copper",
    backgroundImageUrl: unsplash("photo-1579684453423-f84349ef60b0"),
    socialLinks: {
      website: "https://gamedaymenshealth.com/",
      instagram: "https://www.instagram.com/gamedaymenshealth/",
      facebook: "https://www.facebook.com/gamedaymenshealth",
      linkedin: "https://www.linkedin.com/company/gameday-mens-health",
    },
  },
  {
    id: "rucking-realty",
    name: "Rucking Realty Group",
    tag: "Veteran-led real estate",
    industry: "Real estate",
    tierLabel: "Mission sponsor",
    tagline: "Service-minded real estate guidance for military, veterans, and first-responder families.",
    ctaLabel: "Visit website",
    ctaUrl: "https://ruckingrealtygroup.com/",
    logoUrl: clearbitLogo("ruckingrealtygroup.com"),
    warmVariant: "amber",
    backgroundImageUrl: unsplash("photo-1564013799919-ab600027ffc6"),
    socialLinks: {
      website: "https://ruckingrealtygroup.com/",
      facebook: "https://www.facebook.com/ruckingrealtygroup",
      instagram: "https://www.instagram.com/ruckingrealtygroup/",
    },
  },
  {
    id: "iron-soldiers-coffee",
    name: "Iron Soldiers Coffee Company",
    tag: "Veteran-owned",
    industry: "Coffee & retail",
    tierLabel: "Featured support",
    tagline: "Veteran-owned coffee fueling community and giving back to those who serve.",
    ctaLabel: "Visit website",
    ctaUrl: "https://ironsoldierscoffeeco.com/",
    logoUrl: clearbitLogo("ironsoldierscoffeeco.com"),
    warmVariant: "rust",
    backgroundImageUrl: unsplash("photo-1447933601403-0c6688de566e"),
    socialLinks: {
      website: "https://ironsoldierscoffeeco.com/",
      instagram: "https://www.instagram.com/ironsoldierscoffee/",
      facebook: "https://www.facebook.com/IronSoldiersCoffee",
    },
  },
  {
    id: "eduardo-pico-designs",
    name: "Eduardo Pico Designs",
    tag: "Creative partner",
    industry: "Design & branding",
    tierLabel: "Creative sponsor",
    tagline: "Brand and digital design for mission-driven organizations and founders.",
    ctaLabel: "Visit website",
    ctaUrl: "https://eduardopicodesigns.com/",
    logoUrl: clearbitLogo("eduardopicodesigns.com"),
    warmVariant: "teal",
    backgroundImageUrl: unsplash("photo-1454165804606-c3d57bc86b40"),
    socialLinks: {
      website: "https://eduardopicodesigns.com/",
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
    logoUrl: clearbitLogo("warsendmerch.com"),
    warmVariant: "rose",
    backgroundImageUrl: unsplash("photo-1441986300917-64674bd600d8"),
    socialLinks: {},
  },
  {
    id: "brain-treatment-center",
    name: "Brain Treatment Center",
    tag: "Clinical care",
    industry: "Neurological health",
    tierLabel: "Healthcare partner",
    tagline: "Advanced neurological care pathways supporting recovery and quality of life.",
    ctaLabel: "Visit website",
    ctaUrl: "https://braintreatmentcenter.com/",
    logoUrl: clearbitLogo("braintreatmentcenter.com"),
    warmVariant: "sage",
    backgroundImageUrl: unsplash("photo-1530026186672-2cd00ffc50fe"),
    socialLinks: {
      website: "https://braintreatmentcenter.com/",
      facebook: "https://www.facebook.com/braintreatmentcenter",
      linkedin: "https://www.linkedin.com/company/brain-treatment-center",
    },
  },
];
