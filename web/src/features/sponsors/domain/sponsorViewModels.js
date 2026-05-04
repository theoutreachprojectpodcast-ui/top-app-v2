import { resolveSponsorDisplayName } from "@/lib/entityDisplayName";
import { resolveSponsorListingLogoUrl } from "@/lib/sponsors/resolveSponsorListingLogoUrl";
import { FEATURED_SPONSOR_CARD_BACKGROUNDS } from "@/features/sponsors/data/featuredSponsors";

function clean(value) {
  return String(value ?? "").trim();
}

function truncateSponsorLine(value, max = 140) {
  const text = clean(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function parseAdditionalLinks(value) {
  if (Array.isArray(value)) return value.filter((item) => item && item.url);
  const raw = clean(value);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.url) : [];
  } catch {
    return [];
  }
}

function validUrl(url) {
  try {
    const u = new URL(String(url || "").trim());
    return /^https?:$/i.test(u.protocol);
  } catch {
    return false;
  }
}

function platformVerified(url, expectedHost) {
  if (!validUrl(url)) return false;
  return new URL(url).hostname.toLowerCase().includes(expectedHost);
}

export function normalizeSponsorRecord(row = {}) {
  const website = clean(row.website_url || row.ctaUrl || row.website);
  const slug =
    clean(row.slug) ||
    clean(row.id) ||
    clean(row.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "sponsor";
  const name = resolveSponsorDisplayName(clean(row.name)) || clean(row.name) || "Partner";

  return {
    id: clean(row.id) || slug,
    slug,
    name,
    sponsor_scope: clean(row.sponsor_scope) || "app",
    sponsor_type: clean(row.sponsor_type || row.industry || "Mission partner"),
    website_url: website,
    logo_url: clean(row.logo_url || row.logoUrl),
    logo_source_url: clean(row.logo_source_url),
    logo_source_type: clean(row.logo_source_type),
    logo_status: clean(row.logo_status),
    logo_last_enriched_at: row.logo_last_enriched_at ?? null,
    logo_review_status: clean(row.logo_review_status),
    logo_notes: clean(row.logo_notes),
    background_image_url: clean(row.background_image_url || row.backgroundImageUrl),
    short_description: clean(row.short_description || row.tagline),
    long_description: clean(row.long_description || row.description),
    tagline: clean(row.tagline),
    instagram_url: clean(row.instagram_url || row.socialLinks?.instagram),
    facebook_url: clean(row.facebook_url || row.socialLinks?.facebook),
    linkedin_url: clean(row.linkedin_url || row.socialLinks?.linkedin),
    twitter_url: clean(row.twitter_url || row.socialLinks?.twitter || row.socialLinks?.x),
    youtube_url: clean(row.youtube_url || row.socialLinks?.youtube),
    additional_links: parseAdditionalLinks(row.additional_links),
    featured: !!row.featured,
    display_order: Number(row.display_order || 0),
    verified: !!row.verified,
    enrichment_status: clean(row.enrichment_status || "manual"),
    last_enriched_at: clean(row.last_enriched_at),
    warm_variant: clean(row.warm_variant || row.warmVariant || "gold"),
  };
}

export function getSponsorCardViewModel(row = {}) {
  const s = normalizeSponsorRecord(row);
  const fallbackBg =
    FEATURED_SPONSOR_CARD_BACKGROUNDS[s.slug] || FEATURED_SPONSOR_CARD_BACKGROUNDS[s.id] || "";
  /** Prefer concise site-derived tagline, then long description (enrichment merges into these). */
  const cardSubheader = truncateSponsorLine(s.tagline || s.long_description || s.short_description, 140);
  const logoDisplay = resolveSponsorListingLogoUrl(s) || null;
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    cardSubheader,
    tag: s.short_description || "Mission-aligned",
    industry: s.sponsor_type,
    tierLabel: s.featured ? "Featured sponsor" : "Partner sponsor",
    tagline: s.tagline || s.short_description || "Mission partner supporting community outcomes.",
    ctaUrl: s.website_url || null,
    websitePending: !s.website_url,
    logoUrl: logoDisplay,
    warmVariant: s.warm_variant || "gold",
    backgroundImageUrl: s.background_image_url || fallbackBg,
    socialLinks: {
      website: validUrl(s.website_url) ? s.website_url : "",
      instagram: platformVerified(s.instagram_url, "instagram.com") ? s.instagram_url : "",
      facebook: platformVerified(s.facebook_url, "facebook.com") ? s.facebook_url : "",
      linkedin: platformVerified(s.linkedin_url, "linkedin.com") ? s.linkedin_url : "",
      twitter:
        platformVerified(s.twitter_url, "x.com") || platformVerified(s.twitter_url, "twitter.com")
          ? s.twitter_url
          : "",
      youtube:
        platformVerified(s.youtube_url, "youtube.com") || platformVerified(s.youtube_url, "youtu.be")
          ? s.youtube_url
          : "",
    },
  };
}

export function getSponsorProfileViewModel(row = {}) {
  const s = normalizeSponsorRecord(row);
  const logoDisplay = resolveSponsorListingLogoUrl(s) || "";
  return {
    ...s,
    logo_url: logoDisplay,
    socialLinks: [
      { key: "website", label: "Website", url: validUrl(s.website_url) ? s.website_url : "" },
      { key: "instagram", label: "Instagram", url: platformVerified(s.instagram_url, "instagram.com") ? s.instagram_url : "" },
      { key: "facebook", label: "Facebook", url: platformVerified(s.facebook_url, "facebook.com") ? s.facebook_url : "" },
      { key: "linkedin", label: "LinkedIn", url: platformVerified(s.linkedin_url, "linkedin.com") ? s.linkedin_url : "" },
      { key: "twitter", label: "X", url: platformVerified(s.twitter_url, "x.com") || platformVerified(s.twitter_url, "twitter.com") ? s.twitter_url : "" },
      { key: "youtube", label: "YouTube", url: platformVerified(s.youtube_url, "youtube.com") || platformVerified(s.youtube_url, "youtu.be") ? s.youtube_url : "" },
    ].filter((item) => item.url),
  };
}

export function getSponsorAdminViewModel(row = {}) {
  const s = normalizeSponsorRecord(row);
  return {
    ...s,
    additional_links_json: JSON.stringify(s.additional_links || [], null, 2),
  };
}
