import { FEATURED_SPONSORS } from "@/features/sponsors/data/featuredSponsors";
import {
  isMainAppMissionPartnerSlug,
  MAIN_APP_MISSION_PARTNER_SLUGS,
} from "@/features/sponsors/domain/sponsorMissionPartners";
import {
  getSponsorAdminViewModel,
  getSponsorCardViewModel,
  getSponsorProfileViewModel,
  normalizeSponsorRecord,
} from "@/features/sponsors/domain/sponsorViewModels";
import { resolveSponsorListingLogoUrl } from "@/lib/sponsors/resolveSponsorListingLogoUrl";
import { isPublicSponsorRow, preferCuratedField } from "@/lib/sponsors/sponsorVisibility";

const SPONSOR_TABLE = "sponsors_catalog";

/** Omitted from `/sponsors` tier roster and static fallback seed (slug unchanged in DB for history). */
const HIDDEN_SPONSOR_HUB_ROSTER_SLUGS = new Set(["wars-end-merch"]);

/** Slugs omitted from the `/podcasts` sponsor strip (retained in DB for history). */
const PODCAST_SPONSOR_EXCLUDED_SLUGS = new Set([
  "wars-end-merch",
  "gameday-mens-health",
  "game-day-mens-health",
  "apex-global-outdoors",
  "rope-solutions",
]);

/** QA / legacy slugs that map to curated FEATURED_SPONSORS ids. */
export const PODCAST_SPONSOR_SEED_SLUG_ALIASES = {
  "game-day-mens-health": "gameday-mens-health",
  "wrecking-realty-group": "rucking-realty-group",
};

/** Canonical hub/profile slug (seed id) for a URL or DB slug. */
export function canonicalSponsorHubSlug(slug) {
  const key = sponsorCatalogRowKey({ slug });
  if (!key) return "";
  return PODCAST_SPONSOR_SEED_SLUG_ALIASES[key] || key;
}

/** All slug variants to try when resolving a sponsor in the catalog. */
export function sponsorSlugLookupVariants(slug) {
  const key = sponsorCatalogRowKey({ slug });
  if (!key) return [];
  const variants = new Set([key]);
  const canonical = PODCAST_SPONSOR_SEED_SLUG_ALIASES[key];
  if (canonical) variants.add(canonical);
  for (const [alias, can] of Object.entries(PODCAST_SPONSOR_SEED_SLUG_ALIASES)) {
    if (can === key) variants.add(alias);
  }
  return [...variants];
}

function podcastCatalogCanonicalSlug(slug) {
  return canonicalSponsorHubSlug(slug);
}

function isPodcastCatalogAliasSlug(slug) {
  const key = sponsorCatalogRowKey({ slug });
  return !!(key && PODCAST_SPONSOR_SEED_SLUG_ALIASES[key]);
}

/** Slugs hidden from /sponsors roster only (direct `/sponsors/[slug]` may still resolve when active in DB). */
export function isHiddenFromSponsorHubRosterSlug(slug) {
  const key = String(slug || "").trim().toLowerCase();
  return key ? HIDDEN_SPONSOR_HUB_ROSTER_SLUGS.has(key) : false;
}

/** @deprecated Use isHiddenFromSponsorHubRosterSlug — kept for any external imports. */
export function isExcludedFromAppSponsorsHubSlug(slug) {
  return isHiddenFromSponsorHubRosterSlug(slug);
}

/**
 * Website sponsors hub (`/sponsors`): active rows that are not the podcast-only roster.
 * Includes any `sponsor_scope` except `podcast` (null, app, blank, legacy values).
 */
export function filterAppSponsorRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter((r) => {
    if (!isPublicSponsorRow(r)) return false;
    const scope = String(r?.sponsor_scope || "").trim().toLowerCase();
    return scope !== "podcast";
  });
}

/** Any active published sponsor (app + podcast) for detail pages. */
export function filterPublicSponsorDetailRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter((r) => isPublicSponsorRow(r));
}

/** App hub list: podcast filter + slugs omitted from the public tier roster. */
export function filterAppSponsorHubListRows(rows) {
  return filterAppSponsorRows(rows).filter((r) => !isHiddenFromSponsorHubRosterSlug(r?.slug || r?.id));
}

function sponsorCatalogRowKey(r) {
  const slug = String(r?.slug || "").trim().toLowerCase();
  if (slug) return slug;
  return String(r?.id || "").trim().toLowerCase();
}

function sortSponsorsCatalogRows(rows) {
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const da = Number(a?.display_order ?? a?.displayOrder ?? 0);
    const db = Number(b?.display_order ?? b?.displayOrder ?? 0);
    if (da !== db) return da - db;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });
}

/**
 * Prefer server/API rows when the same slug exists in both lists; add client-only rows (e.g. anon RLS gaps vs read client).
 * @param {Record<string, unknown>[]} apiRows
 * @param {Record<string, unknown>[]} clientRows
 */
export function mergeAppSponsorCatalogLists(apiRows, clientRows) {
  const bySlug = new Map();
  for (const r of Array.isArray(clientRows) ? clientRows : []) {
    const k = sponsorCatalogRowKey(r);
    if (k) bySlug.set(k, r);
  }
  for (const r of Array.isArray(apiRows) ? apiRows : []) {
    const k = sponsorCatalogRowKey(r);
    if (k) bySlug.set(k, r);
  }
  return sortSponsorsCatalogRows(filterAppSponsorHubListRows([...bySlug.values()]));
}

/** Mission partner / foundational sponsors with curated profile copy in FEATURED_SPONSORS seed. */
const SEED_CURATED_PROFILE_SLUGS = MAIN_APP_MISSION_PARTNER_SLUGS;

function nonEmptyTrim(value) {
  const s = String(value ?? "").trim();
  return s || "";
}

/** Prefer first non-empty value (left wins — DB / curated enrichment over seed). */
function preferCuratedCopy(primaryVal, fallbackVal) {
  return nonEmptyTrim(primaryVal) || nonEmptyTrim(fallbackVal);
}

/**
 * Merge a live sponsors_catalog row with the static FEATURED_SPONSORS seed when available.
 * @param {ReturnType<normalizeSponsorRecord> | null | undefined} liveRow
 */
export function mergeSponsorCatalogRowWithSeed(liveRow) {
  if (!liveRow) return null;
  const key = sponsorCatalogRowKey(liveRow);
  if (!key) return normalizeSponsorRecord(liveRow);
  const seed = getStaticAppSponsorCatalogRows().find((r) => sponsorCatalogRowKey(r) === key);
  if (!seed) return normalizeSponsorRecord(liveRow);
  return mergeSponsorHubSeedRowWithLive(seed, normalizeSponsorRecord(liveRow));
}

/**
 * When a catalog row exists in both the static seed and Supabase/API, DB often has sparse copy.
 * Overlay live fields but keep curated seed text, art, and links whenever live omits them.
 *
 * @param {ReturnType<normalizeSponsorRecord>} seed
 * @param {ReturnType<normalizeSponsorRecord>} live
 */
export function mergeSponsorHubSeedRowWithLive(seed, live) {
  const pick = (key) => nonEmptyTrim(live[key]) || nonEmptyTrim(seed[key]) || "";
  const preferSeedCopy = SEED_CURATED_PROFILE_SLUGS.has(sponsorCatalogRowKey(seed));
  const pickText = (key) =>
    preferSeedCopy
      ? preferCuratedCopy(seed[key], live[key])
      : preferCuratedCopy(live[key], seed[key]);
  const liveLogoResolved = resolveSponsorListingLogoUrl(live);
  const seedLogoResolved = resolveSponsorListingLogoUrl(seed);
  const preferSeedLogo = !liveLogoResolved && !!seedLogoResolved;
  const logo_url =
    liveLogoResolved ||
    seedLogoResolved ||
    nonEmptyTrim(live.logo_url) ||
    nonEmptyTrim(seed.logo_url) ||
    "";

  const pickSocial = (key) =>
    preferSeedCopy ? preferCuratedCopy(seed[key], live[key]) : pick(key) || seed[key];

  return normalizeSponsorRecord({
    ...seed,
    ...live,
    name: preferSeedCopy ? preferCuratedCopy(seed.name, live.name) : pick("name") || seed.name,
    display_name: preferSeedCopy ? preferCuratedCopy(seed.display_name, live.display_name) : pick("display_name") || seed.display_name,
    long_description: pickText("long_description"),
    short_description: pickText("short_description"),
    tagline: pickText("tagline"),
    website_url: pick("website_url"),
    logo_url,
    logo_status: preferSeedLogo ? seed.logo_status : live.logo_status,
    logo_review_status: preferSeedLogo ? seed.logo_review_status : live.logo_review_status,
    background_image_url: pick("background_image_url"),
    sponsor_category: pickText("sponsor_category") || pick("sponsor_category") || seed.sponsor_category,
    sponsor_type: preferSeedCopy
      ? preferCuratedCopy(seed.sponsor_type, live.sponsor_type)
      : pick("sponsor_type") || seed.sponsor_type,
    primary_display_tag: preferSeedCopy
      ? preferCuratedCopy(seed.primary_display_tag, live.primary_display_tag)
      : pick("primary_display_tag") || seed.primary_display_tag,
    sponsor_display_group: preferSeedCopy
      ? preferCuratedCopy(seed.sponsor_display_group, live.sponsor_display_group)
      : pick("sponsor_display_group") || seed.sponsor_display_group,
    internal_alias: pick("internal_alias") || seed.internal_alias,
    warm_variant: pick("warm_variant") || seed.warm_variant,
    instagram_url: pickSocial("instagram_url"),
    facebook_url: pickSocial("facebook_url"),
    linkedin_url: pickSocial("linkedin_url"),
    twitter_url: pickSocial("twitter_url"),
    youtube_url: pickSocial("youtube_url"),
    display_order: Number.isFinite(Number(live.display_order)) ? Number(live.display_order) : Number(seed.display_order),
    is_active: live.is_active != null ? live.is_active : seed.is_active,
    sponsor_scope: preferSeedCopy
      ? preferCuratedCopy(seed.sponsor_scope, live.sponsor_scope)
      : pick("sponsor_scope") || seed.sponsor_scope,
    mission_partner: preferSeedCopy ? true : live.mission_partner != null ? live.mission_partner : seed.mission_partner,
    veteran_owned: live.veteran_owned != null ? live.veteran_owned : seed.veteran_owned,
    featured: preferSeedCopy ? true : live.featured != null ? live.featured : seed.featured,
    verified: live.verified != null ? live.verified : seed.verified,
    cta_label: pick("cta_label") || seed.cta_label,
    sponsor_status: pick("sponsor_status") || seed.sponsor_status,
    enrichment_status: nonEmptyTrim(live.enrichment_status) || seed.enrichment_status,
  });
}

/**
 * `/sponsors` hub: static seed is the roster floor. Live rows merge per slug — live wins when populated,
 * otherwise seed copy/art/links are kept so cards do not lose body text or logos after fetch.
 * @param {Record<string, unknown>[]} liveRows merged API + browser catalog (may be empty)
 */
export function mergeLiveHubCatalogWithStaticSeed(liveRows) {
  const staticRows = getStaticAppSponsorCatalogRows();
  const bySlug = new Map();
  for (const r of staticRows) {
    const k = sponsorCatalogRowKey(r);
    if (k) bySlug.set(k, normalizeSponsorRecord(r));
  }
  for (const r of Array.isArray(liveRows) ? liveRows : []) {
    const canonicalKey = canonicalSponsorHubSlug(r?.slug || r?.id);
    if (!canonicalKey) continue;
    const [allowed] = filterAppSponsorHubListRows([r]);
    if (!allowed) continue;
    const live = normalizeSponsorRecord({ ...allowed, slug: canonicalKey, id: canonicalKey });
    const seed = bySlug.get(canonicalKey);
    if (seed) {
      bySlug.set(canonicalKey, mergeSponsorHubSeedRowWithLive(seed, live));
    } else {
      bySlug.set(canonicalKey, live);
    }
  }
  return sortSponsorsCatalogRows(filterAppSponsorHubListRows([...bySlug.values()]));
}

function buildPodcastSeedBySlug() {
  const bySlug = new Map();
  for (const r of fallbackRows()) {
    const k = sponsorCatalogRowKey(r);
    if (k) bySlug.set(k, normalizeSponsorRecord({ ...r, sponsor_scope: "podcast" }));
  }
  for (const [alias, canonical] of Object.entries(PODCAST_SPONSOR_SEED_SLUG_ALIASES)) {
    const seed = bySlug.get(canonical);
    if (seed) bySlug.set(alias, seed);
  }
  return bySlug;
}

function lookupPodcastSeedRow(seedBySlug, slug) {
  const key = sponsorCatalogRowKey({ slug });
  if (!key) return null;
  if (seedBySlug.has(key)) return seedBySlug.get(key);
  const alias = PODCAST_SPONSOR_SEED_SLUG_ALIASES[key];
  return alias && seedBySlug.has(alias) ? seedBySlug.get(alias) : null;
}

/** Offline podcast roster floor (curated logos + copy when DB rows are sparse). */
export function getStaticPodcastSponsorCatalogRows() {
  const seen = new Set();
  const rows = [];
  for (const row of buildPodcastSeedBySlug().values()) {
    const id = sponsorCatalogRowKey(row);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    rows.push(row);
  }
  return sortSponsorsCatalogRows(rows);
}

/**
 * `/podcasts` sponsor strip: merge live `sponsor_scope=podcast` rows with curated seed art/links.
 * @param {Record<string, unknown>[]} liveRows
 */
export function mergeLivePodcastCatalogWithStaticSeed(liveRows) {
  const seedBySlug = buildPodcastSeedBySlug();
  const live = Array.isArray(liveRows) ? liveRows : [];
  if (!live.length) return getStaticPodcastSponsorCatalogRows();

  const bySlug = new Map();
  for (const r of live) {
    const rawKey = sponsorCatalogRowKey(r);
    if (!rawKey || PODCAST_SPONSOR_EXCLUDED_SLUGS.has(rawKey)) continue;

    const canonical = podcastCatalogCanonicalSlug(rawKey);
    const alias = isPodcastCatalogAliasSlug(rawKey);
    const normalized = normalizeSponsorRecord({
      ...r,
      slug: canonical,
      id: canonical,
      sponsor_scope: "podcast",
    });
    const seed = lookupPodcastSeedRow(seedBySlug, canonical) || lookupPodcastSeedRow(seedBySlug, rawKey);
    let merged = seed ? mergeSponsorHubSeedRowWithLive(seed, normalized) : normalized;
    if (alias && seed) {
      merged = normalizeSponsorRecord({
        ...merged,
        slug: canonical,
        id: canonical,
        name: seed.name,
        display_name: seed.display_name || seed.name,
        website_url: nonEmptyTrim(seed.website_url) || merged.website_url,
      });
    }
    const existing = bySlug.get(canonical);
    bySlug.set(canonical, existing ? mergeSponsorHubSeedRowWithLive(merged, existing) : merged);
  }
  return sortSponsorsCatalogRows([...bySlug.values()]);
}

function fallbackRows() {
  const seed = FEATURED_SPONSORS;
  return seed.map((item, idx) => {
    const social = item.socialLinks && typeof item.socialLinks === "object" ? item.socialLinks : {};
    return normalizeSponsorRecord({
      ...item,
      id: item.id,
      slug: item.id,
      name: item.name,
      display_name: item.displayName,
      internal_alias: item.internalAlias,
      primary_display_tag: item.primaryDisplayTag || "Foundational Sponsor",
      sponsor_type: item.sponsorType || "foundational_sponsor",
      sponsor_display_group: item.sponsorDisplayGroup || "",
      sponsor_scope: "app",
      sponsor_category: item.industry,
      website_url: item.ctaUrl,
      logo_url: item.logoUrl,
      background_image_url: item.backgroundImageUrl,
      short_description: item.tag,
      long_description: item.longDescription || item.description || item.tagline,
      tagline: item.subtitle || item.tagline,
      instagram_url: social.instagram || "",
      facebook_url: social.facebook || "",
      linkedin_url: social.linkedin || "",
      twitter_url: social.twitter || social.x || "",
      youtube_url: social.youtube || "",
      social_links: social,
      featured: true,
      is_active: true,
      sponsor_status: "active",
      mission_partner: !!item.missionPartner,
      veteran_owned: !!item.veteranOwned,
      display_order: idx + 1,
      enrichment_status: "seed",
      verified: true,
    });
  });
}

/** Offline seed for `/sponsors` — same as DB fallback (instant paint + recovery when fetch fails). */
export function getStaticAppSponsorCatalogRows() {
  return filterAppSponsorHubListRows(fallbackRows());
}

/**
 * Merge `sponsor_enrichment` titles/descriptions onto normalized catalog rows (server or browser).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {ReturnType<normalizeSponsorRecord>[]} normalizedRows
 */
export async function mergeSponsorEnrichmentForRows(supabase, normalizedRows) {
  const sponsorIds = normalizedRows.map((row) => row.id).filter(Boolean);
  if (!sponsorIds.length) return normalizedRows;

  const { data: enrichRows, error: enrichErr } = await supabase
    .from("sponsor_enrichment")
    .select(
      "sponsor_id,canonical_display_name,extracted_site_title,extracted_meta_description,curated_tagline,curated_short_description,curated_long_description,source_summary,enrichment_status,last_enriched_at,review_required,research_draft"
    )
    .in("sponsor_id", sponsorIds);
  if (enrichErr || !Array.isArray(enrichRows) || !enrichRows.length) return normalizedRows;

  const byId = new Map(enrichRows.map((row) => [String(row.sponsor_id), row]));
  return normalizedRows.map((row) => {
    const enrich = byId.get(String(row.id));
    if (!enrich) return row;
    const skipCuratedCopy = isMainAppMissionPartnerSlug(row.slug);
    const extTitle = String(enrich.extracted_site_title || "").trim();
    const extDesc = String(enrich.extracted_meta_description || "").trim();
    const explicitDisplay = String(row.display_name || "").trim();
    const mergedName = explicitDisplay ? row.name : enrich.canonical_display_name || row.name;
    const tagline = skipCuratedCopy
      ? row.tagline
      : preferCuratedField(row.tagline, enrich.curated_tagline) || extTitle || row.tagline;
    const short_description = skipCuratedCopy
      ? row.short_description
      : preferCuratedField(row.short_description, enrich.curated_short_description) || row.short_description;
    const long_description = skipCuratedCopy
      ? row.long_description
      : preferCuratedField(row.long_description, enrich.curated_long_description) || extDesc || row.long_description;
    return normalizeSponsorRecord({
      ...row,
      name: skipCuratedCopy ? row.name : mergedName,
      tagline,
      short_description,
      long_description,
      enrichment_status: enrich.enrichment_status || row.enrichment_status,
      last_enriched_at: enrich.last_enriched_at || row.last_enriched_at,
      research_draft: enrich.research_draft || row.research_draft,
    });
  });
}

/** Load sponsors from Supabase (no HTTP proxy). Used by API routes with the service role. */
export async function listSponsorsCatalogWithClient(supabase, opts = {}) {
  const sponsorScope = String(opts.sponsorScope || opts.scope || "app").toLowerCase();
  if (!supabase) return sponsorScope === "podcast" ? getStaticPodcastSponsorCatalogRows() : filterAppSponsorHubListRows(fallbackRows());
  let q = supabase.from(SPONSOR_TABLE).select("*").eq("is_active", true);
  if (sponsorScope === "podcast") {
    q = q.eq("sponsor_scope", "podcast");
  }
  const { data, error } = await q
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error || !Array.isArray(data) || !data.length) {
    return sponsorScope === "podcast" ? getStaticPodcastSponsorCatalogRows() : filterAppSponsorHubListRows(fallbackRows());
  }

  const scoped =
    sponsorScope === "app"
      ? filterAppSponsorRows(data.filter((r) => isPublicSponsorRow(r)))
      : data.filter((r) => isPublicSponsorRow(r));
  if (sponsorScope === "app" && !scoped.length) {
    return filterAppSponsorHubListRows(fallbackRows());
  }

  const rows = scoped.map((row) => normalizeSponsorRecord(row));
  const merged = await mergeSponsorEnrichmentForRows(supabase, rows);
  if (sponsorScope === "podcast") {
    return mergeLivePodcastCatalogWithStaticSeed(merged);
  }
  return filterAppSponsorHubListRows(merged);
}

async function fetchAppSponsorsCatalogFromApi() {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/sponsors/catalog", { credentials: "include", cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.rows)) return null;
    return data.rows.map((r) => normalizeSponsorRecord(r));
  } catch {
    return null;
  }
}

/** Website sponsors hub (`/sponsors`): static seed floor + API + Supabase. Prefer `loadAppSponsorHubCatalog` from `sponsorHubCatalog.js` for page loads. */
export async function listAppSponsorsCatalog(supabase, opts = {}) {
  void opts;
  const staticRows = getStaticAppSponsorCatalogRows();
  try {
    const [fromApi, fromClient] = await Promise.all([
      fetchAppSponsorsCatalogFromApi(),
      listSponsorsCatalogWithClient(supabase, { sponsorScope: "app" }),
    ]);
    const api = Array.isArray(fromApi) ? fromApi : [];
    const client = Array.isArray(fromClient) ? fromClient : [];
    let merged;
    if (!api.length) merged = client;
    else if (!client.length) merged = api;
    else merged = mergeAppSponsorCatalogLists(api, client);
    const out = mergeLiveHubCatalogWithStaticSeed(merged);
    return out.length ? out : staticRows;
  } catch {
    /* network / parse — use seed */
  }
  return staticRows;
}

function findSeedSponsorBySlug(slug) {
  const variants = new Set(sponsorSlugLookupVariants(slug));
  return fallbackRows().find((r) => variants.has(sponsorCatalogRowKey(r))) || null;
}

async function fetchPublicSponsorCatalogRow(supabase, slug) {
  const variants = sponsorSlugLookupVariants(slug);
  if (!variants.length) return null;
  const { data, error } = await supabase
    .from(SPONSOR_TABLE)
    .select("*")
    .in("slug", variants)
    .eq("is_active", true);
  if (error || !Array.isArray(data) || !data.length) return null;
  return data.find((r) => isPublicSponsorRow(r)) || data[0] || null;
}

async function buildPublicSponsorProfileRow(supabase, slug) {
  const key = String(slug || "").trim();
  if (!key) return null;
  const row = supabase ? await fetchPublicSponsorCatalogRow(supabase, key) : null;
  if (row) {
    const canonical = canonicalSponsorHubSlug(row.slug || key);
    const mergedBase =
      mergeSponsorCatalogRowWithSeed({ ...row, slug: canonical, id: canonical }) ||
      normalizeSponsorRecord({ ...row, slug: canonical, id: canonical });
    const [enriched] = await mergeSponsorEnrichmentForRows(supabase, [mergedBase]);
    const merged = mergeSponsorCatalogRowWithSeed(enriched) || enriched;
    const [allowed] = filterPublicSponsorDetailRows([merged]);
    if (allowed) return allowed;
  }
  return findSeedSponsorBySlug(key);
}

/** Server/catalog API: merged public sponsor row for a slug (aliases + seed fallback). */
export async function getPublicSponsorCatalogRowBySlug(supabase, slug) {
  return buildPublicSponsorProfileRow(supabase, slug);
}

export async function getSponsorBySlug(supabase, slug) {
  const key = String(slug || "").trim();
  if (!key) return null;

  const seedProfile = () => {
    const seed = findSeedSponsorBySlug(key);
    return seed ? getSponsorProfileViewModel(seed) : null;
  };

  if (typeof window !== "undefined") {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 12_000);
      const res = await fetch(`/api/sponsors/catalog?slug=${encodeURIComponent(key)}`, {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && data.row) return getSponsorProfileViewModel(data.row);
    } catch {
      /* API unavailable — fall back to bundled seed */
    }
    return seedProfile();
  }

  const row = await buildPublicSponsorProfileRow(supabase, key);
  if (row) return getSponsorProfileViewModel(row);
  return seedProfile();
}

export async function saveSponsorAdminRecord(supabase, payload) {
  const row = normalizeSponsorRecord(payload);
  if (!supabase) return { ok: false, error: "Supabase client unavailable." };
  const { error } = await supabase.from(SPONSOR_TABLE).upsert(row, { onConflict: "slug" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function runSponsorEnrichment(slug) {
  const res = await fetch("/api/sponsors/enrich", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error || data?.message || "Enrichment failed." };
  return { ok: true, row: data?.row || null };
}

/** Moderator-only: official-site logo discovery → storage (see /api/admin/sponsors/logo-enrichment). */
export async function runSponsorLogoEnrichment(slug, { force = false, batch = false, limit = 8 } = {}) {
  const res = await fetch("/api/admin/sponsors/logo-enrichment", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(batch ? { mode: "batch", limit, delayMs: 450, force } : { slug, force }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error || data?.message || "Logo enrichment failed." };
  return { ok: true, ...data };
}

export function mapSponsorsToCardModels(rows = []) {
  return rows.map((row) => getSponsorCardViewModel(row));
}

export function mapSponsorsToAdminModels(rows = []) {
  return rows.map((row) => getSponsorAdminViewModel(row));
}
