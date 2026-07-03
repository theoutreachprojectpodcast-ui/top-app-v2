import { resolveSponsorDisplayName } from "@/lib/entityDisplayName";
import { resolveSponsorListingLogoUrl } from "@/lib/sponsors/resolveSponsorListingLogoUrl";
import { normalizePublishStatus } from "@/lib/sponsors/sponsorVisibility";
import { FEATURED_SPONSOR_CARD_BACKGROUNDS } from "@/features/sponsors/data/featuredSponsors";
import { getSponsorCardPresentation } from "@/features/sponsors/domain/sponsorCardPresentation";
import { inferSponsorDisplayGroup } from "@/features/sponsors/domain/sponsorDisplayGroups";

function clean(value) {
  return String(value ?? "").trim();
}

function validUrl(value) {
  const raw = clean(value);
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function truncateSponsorLine(value, max = 140) {
  const text = clean(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function collapseSponsorBlurb(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * True when two sponsor blurbs carry the same lead message (exact match, shared long prefix, or one extends the other).
 * Used to avoid repeating tagline / subtitle / short description on cards and profiles.
 */
export function sponsorBlurbsRedundant(a, b) {
  const x = collapseSponsorBlurb(a).toLowerCase();
  const y = collapseSponsorBlurb(b).toLowerCase();
  if (!x || !y) return false;
  if (x === y) return true;
  const [shorter, longer] = x.length <= y.length ? [x, y] : [y, x];
  if (shorter.length >= 28 && longer.startsWith(shorter.slice(0, 28))) return true;
  const n = Math.min(52, shorter.length, longer.length);
  if (n >= 14 && x.slice(0, n) === y.slice(0, n)) return true;
  return false;
}

/** Hide category line when it only repeats the mission pill (e.g. "Apparel" vs "Apparel & impact"). */
function isIndustryRedundantWithMissionPill(industry, missionPill) {
  const i = String(industry || "").trim().toLowerCase();
  const t = String(missionPill || "").trim().toLowerCase();
  if (!i || !t) return false;
  if (t === i) return true;
  if (t.startsWith(`${i} `) || t.startsWith(`${i}&`) || t.startsWith(`${i},`)) return true;
  return false;
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

function parseFeaturedItems(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        title: clean(item?.title),
        description: clean(item?.description),
        url: validUrl(item?.url) ? clean(item.url) : "",
      }))
      .filter((item) => item.title || item.url);
  }
  const raw = clean(value);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parseFeaturedItems(parsed) : [];
  } catch {
    return [];
  }
}

function resolveSponsorCtaUrl(row = {}) {
  const cta = clean(row.cta_url || row.ctaUrl);
  const website = clean(row.website_url || row.ctaUrl || row.website);
  if (validUrl(cta)) return cta;
  if (validUrl(website)) return website;
  return "";
}

function platformVerified(url, expectedHost) {
  if (!validUrl(url)) return false;
  return new URL(url).hostname.toLowerCase().includes(expectedHost);
}

function mergeSocialLinksRow(row = {}) {
  const raw = row.social_links;
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? raw
      : (() => {
          try {
            const parsed = typeof raw === "string" && raw.trim() ? JSON.parse(raw) : null;
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
          } catch {
            return {};
          }
        })();
  const seed = row.socialLinks && typeof row.socialLinks === "object" && !Array.isArray(row.socialLinks) ? row.socialLinks : {};
  const pick = (k, ...alts) => {
    for (const key of [k, ...alts]) {
      const v = obj[key];
      if (v != null && String(v).trim()) return v;
    }
    return "";
  };
  const pickSeed = (k, ...alts) => {
    for (const key of [k, ...alts]) {
      const v = seed[key];
      if (v != null && String(v).trim()) return v;
    }
    return "";
  };
  return {
    instagram_url: clean(row.instagram_url || pick("instagram", "instagram_url") || pickSeed("instagram", "instagram_url")),
    facebook_url: clean(row.facebook_url || pick("facebook", "facebook_url") || pickSeed("facebook", "facebook_url")),
    linkedin_url: clean(row.linkedin_url || pick("linkedin", "linkedin_url") || pickSeed("linkedin", "linkedin_url")),
    twitter_url: clean(row.twitter_url || pick("twitter", "x", "twitter_url") || pickSeed("twitter", "x", "twitter_url")),
    youtube_url: clean(row.youtube_url || pick("youtube", "youtube_url") || pickSeed("youtube", "youtube_url")),
  };
}

export function normalizeSponsorRecord(row = {}) {
  const social = mergeSocialLinksRow(row);
  const website = clean(row.website_url || row.ctaUrl || row.website);
  const slug =
    clean(row.slug) ||
    clean(row.id) ||
    clean(row.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "sponsor";
  const rawTitle = clean(row.display_name) || clean(row.name);
  const name = resolveSponsorDisplayName(rawTitle) || rawTitle || "Partner";

  return {
    id: clean(row.id) || slug,
    slug,
    name,
    display_name: clean(row.display_name || row.displayName),
    internal_alias: clean(row.internal_alias || row.internalAlias),
    primary_display_tag: clean(row.primary_display_tag || row.primaryDisplayTag),
    sponsor_scope: clean(row.sponsor_scope) || "app",
    sponsor_type: clean(row.sponsor_type || row.industry || "Mission partner"),
    sponsor_category: clean(row.sponsor_category || row.industry || ""),
    sponsor_display_group: clean(row.sponsor_display_group || row.sponsorDisplayGroup || ""),
    website_url: website,
    logo_url: clean(row.logo_url || row.logoUrl),
    logo_source_url: clean(row.logo_source_url),
    logo_source_type: clean(row.logo_source_type),
    logo_status: clean(row.logo_status),
    logo_last_enriched_at: row.logo_last_enriched_at ?? null,
    logo_review_status: clean(row.logo_review_status),
    logo_notes: clean(row.logo_notes),
    background_image_url: clean(row.background_image_url || row.backgroundImageUrl),
    short_description: clean(row.short_description || row.tag || row.tagline),
    long_description: clean(row.long_description || row.description || row.longDescription),
    tagline: clean(row.tagline || row.subtitle),
    instagram_url: social.instagram_url,
    facebook_url: social.facebook_url,
    linkedin_url: social.linkedin_url,
    twitter_url: social.twitter_url,
    youtube_url: social.youtube_url,
    additional_links: parseAdditionalLinks(row.additional_links),
    featured: !!row.featured,
    display_order: Number(row.display_order || 0),
    verified: !!row.verified,
    is_active: row.is_active == null ? true : !!row.is_active,
    sponsor_status: clean(row.sponsor_status || "active"),
    payment_status: clean(row.payment_status || ""),
    enrichment_status: clean(row.enrichment_status || "manual"),
    last_enriched_at: clean(row.last_enriched_at),
    warm_variant: clean(row.warm_variant || row.warmVariant || "gold"),
    mission_partner: row.mission_partner == null ? false : !!row.mission_partner,
    veteran_owned:
      row.veteran_owned == null && row.veteranOwned == null
        ? false
        : !!(row.veteran_owned ?? row.veteranOwned),
    cta_label: clean(row.cta_label || row.ctaLabel),
    cta_url: clean(row.cta_url || row.ctaUrl),
    promo_code: clean(row.promo_code || row.promoCode),
    inquiry_url: clean(row.inquiry_url || row.inquiryUrl),
    publish_status: normalizePublishStatus(row.publish_status),
    published_at: row.published_at ?? null,
    featured_items: parseFeaturedItems(row.featured_items),
    research_draft:
      row.research_draft && typeof row.research_draft === "object" && !Array.isArray(row.research_draft)
        ? row.research_draft
        : null,
    updated_at: row.updated_at ?? null,
  };
}

/** Single upper-left card badge — admin `primary_display_tag` or a safe default from sponsor_type. */
function resolvePrimaryDisplayBadge(s) {
  const custom = String(s.primary_display_tag || "").trim();
  if (custom) {
    const key = custom
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "primary";
    return { key: `tag-${key}`, label: custom };
  }
  const typeLc = String(s.sponsor_type || "").toLowerCase();
  if (typeLc === "foundational_sponsor") {
    return { key: "foundational", label: "Foundational Sponsor" };
  }
  if (typeLc === "mission_partner_sponsor") {
    return { key: "mission-partner", label: "Mission Partner Sponsor" };
  }
  if (typeLc === "impact_sponsor") {
    return { key: "impact", label: "Impact Sponsor" };
  }
  if (typeLc === "community_sponsor") {
    return { key: "community-sponsor", label: "Community Sponsor" };
  }
  if (typeLc === "community_partner") {
    return { key: "community", label: "Community Partner" };
  }
  if (typeLc === "podcast_sponsor" || typeLc === "podcast") {
    return { key: "podcast", label: "Podcast Sponsor" };
  }
  return { key: "partner", label: "Partner Sponsor" };
}

function pillRedundantWithPrimaryBadge(pillText, badge) {
  const p = collapseSponsorBlurb(pillText).toLowerCase();
  const lbl = collapseSponsorBlurb(badge?.label || "").toLowerCase();
  if (!p || !lbl) return false;
  if (p === lbl) return true;
  const pn = p.replace(/[^a-z0-9]+/g, "");
  const ln = lbl.replace(/[^a-z0-9]+/g, "");
  if (pn && ln && (pn === ln || pn.includes(ln) || ln.includes(pn))) return true;
  return false;
}

/** DB sometimes stores tier enum in `sponsor_type` — do not surface as an "industry" chip. */
function sponsorTypeLooksLikeTierKey(value) {
  const t = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return /^(foundational_sponsor|mission_partner_sponsor|impact_sponsor|community_sponsor|community_partner|podcast_sponsor|partner_sponsor)$/.test(
    t,
  );
}

export function getSponsorCardViewModel(row = {}) {
  const s = normalizeSponsorRecord(row);
  const presentation = getSponsorCardPresentation(s.slug);
  const fallbackBg =
    FEATURED_SPONSOR_CARD_BACKGROUNDS[s.slug] || FEATURED_SPONSOR_CARD_BACKGROUNDS[s.id] || "";
  const primaryBadge = resolvePrimaryDisplayBadge(s);
  const pillRaw = collapseSponsorBlurb(s.short_description);
  const pill = pillRaw && !pillRedundantWithPrimaryBadge(pillRaw, primaryBadge) ? pillRaw : "";
  const sub = collapseSponsorBlurb(s.tagline);
  const long = collapseSponsorBlurb(s.long_description);
  const missionPill = pill;

  const subAddsBeyondPill = sub.length > 0 && !sponsorBlurbsRedundant(sub, pill);
  const longAddsBeyondPill = long.length > 0 && !sponsorBlurbsRedundant(long, pill);
  const longAddsBeyondSub = long.length > 0 && sub.length > 0 && !sponsorBlurbsRedundant(long, sub);

  let cardSubheader = "";
  let bodyTeaser = "";

  if (longAddsBeyondPill && longAddsBeyondSub) {
    bodyTeaser = truncateSponsorLine(long, 320);
    const subOverlapsLongOpening =
      subAddsBeyondPill && sponsorBlurbsRedundant(sub, long.slice(0, Math.min(long.length, Math.max(sub.length + 24, 96))));
    cardSubheader = subAddsBeyondPill && !subOverlapsLongOpening ? truncateSponsorLine(sub, 160) : "";
  } else if (longAddsBeyondPill) {
    bodyTeaser = truncateSponsorLine(long, 320);
    cardSubheader = subAddsBeyondPill && !sponsorBlurbsRedundant(sub, long) ? truncateSponsorLine(sub, 160) : "";
  } else if (subAddsBeyondPill) {
    bodyTeaser = truncateSponsorLine(sub, 320);
  }

  if (bodyTeaser && sponsorBlurbsRedundant(bodyTeaser, missionPill)) bodyTeaser = "";
  if (cardSubheader && sponsorBlurbsRedundant(cardSubheader, missionPill)) cardSubheader = "";
  if (cardSubheader && bodyTeaser && sponsorBlurbsRedundant(cardSubheader, bodyTeaser)) cardSubheader = "";
  const industryCat = clean(s.sponsor_category);
  const industryType = clean(s.sponsor_type);
  const industryRaw =
    industryCat || (!sponsorTypeLooksLikeTierKey(industryType) ? industryType : "");
  const industry = isIndustryRedundantWithMissionPill(industryRaw, missionPill) ? "" : industryRaw;
  const logoDisplay = resolveSponsorListingLogoUrl(s) || null;
  const veteranOwned = !!s.veteran_owned || !!presentation.veteranOwnedDefault;
  const locationChips = presentation.locationChips?.length ? presentation.locationChips : [];
  const ctaUrl = resolveSponsorCtaUrl(s);
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    cardSubheader,
    tag: missionPill,
    industry,
    tierLabel: s.featured ? "Featured sponsor" : "Partner sponsor",
    primaryBadge,
    tagline: bodyTeaser,
    ctaUrl: ctaUrl || null,
    ctaLabel: s.cta_label || (ctaUrl ? "Visit Website" : ""),
    websitePending: !ctaUrl,
    logoUrl: logoDisplay,
    warmVariant: s.warm_variant || "gold",
    backgroundImageUrl: s.background_image_url || fallbackBg,
    cardScrimGradient: presentation.cardScrimGradient || "",
    sponsorAccentColor: presentation.accentColor || "",
    logoFallbackUrls: Array.isArray(presentation.logoFallbackUrls) ? presentation.logoFallbackUrls : [],
    logoPanelMode: presentation.logoPanelMode || "auto",
    missionPartner: !!s.mission_partner,
    featured: !!s.featured,
    veteranOwned,
    locationChips,
    displayGroup: inferSponsorDisplayGroup(s),
    isPodcastSponsor: String(s.sponsor_scope || "").trim().toLowerCase() === "podcast",
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
  const presentation = getSponsorCardPresentation(s.slug);
  const primary = resolveSponsorListingLogoUrl(s);
  const fallbacks = Array.isArray(presentation.logoFallbackUrls)
    ? presentation.logoFallbackUrls.map((u) => clean(u)).filter(Boolean)
    : [];
  const seen = new Set();
  const logoCandidates = [];
  for (const u of [primary, ...fallbacks]) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    logoCandidates.push(u);
  }
  const logoDisplay = logoCandidates[0] || "";

  const fallbackBg =
    FEATURED_SPONSOR_CARD_BACKGROUNDS[s.slug] || FEATURED_SPONSOR_CARD_BACKGROUNDS[s.id] || "";
  const heroImage = clean(s.background_image_url) || fallbackBg;
  const ctaUrl = resolveSponsorCtaUrl(s);
  const isPodcastSponsor = String(s.sponsor_scope || "").trim().toLowerCase() === "podcast";
  const lastUpdated = clean(s.published_at || s.last_enriched_at || s.updated_at);

  return {
    ...s,
    sponsor_display_group: clean(s.sponsor_display_group) || inferSponsorDisplayGroup(s),
    background_image_url: heroImage,
    logo_url: logoDisplay,
    logo_candidate_urls: logoCandidates,
    logoPanelMode: presentation.logoPanelMode || "auto",
    ctaUrl,
    ctaLabel: s.cta_label || (ctaUrl ? "Visit Website" : ""),
    promoCode: s.promo_code || "",
    inquiryUrl: validUrl(s.inquiry_url) ? s.inquiry_url : "",
    featuredItems: s.featured_items || [],
    isPodcastSponsor,
    profileBackHref: isPodcastSponsor ? "/podcasts" : "/sponsors",
    profileBackLabel: isPodcastSponsor ? "← Podcast sponsors" : "← All sponsors",
    lastUpdatedLabel: lastUpdated
      ? new Date(lastUpdated).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      : "",
    socialLinks: [
      { key: "website", label: "Website", url: validUrl(ctaUrl || s.website_url) ? ctaUrl || s.website_url : "" },
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
    featured_items_json: JSON.stringify(s.featured_items || [], null, 2),
    research_draft_json: s.research_draft ? JSON.stringify(s.research_draft, null, 2) : "",
  };
}
