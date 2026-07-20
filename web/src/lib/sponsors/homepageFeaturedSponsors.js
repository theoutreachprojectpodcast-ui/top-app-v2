import { getSponsorCardViewModel, normalizeSponsorRecord } from "@/features/sponsors/domain/sponsorViewModels";
import {
  canonicalSponsorHubSlug,
  mergeLiveHubCatalogWithStaticSeed,
  mergeSponsorCatalogRowWithSeed,
} from "@/features/sponsors/api/sponsorCatalogApi";
import { getSponsorCardPresentation } from "@/features/sponsors/domain/sponsorCardPresentation";
import { FEATURED_SPONSORS } from "@/features/sponsors/data/featuredSponsors";

/** Fixed home carousel order — seed floor + DB merge per slug. */
export const HOMEPAGE_SPOTLIGHT_SLUGS = ["gameday-mens-health", "rope-solutions", "apex-global-outdoors"];

/** Mission Partners marked featured + active for the home spotlight row. */
export function isHomepageFeaturedSponsorRow(row) {
  if (!row || typeof row !== "object") return false;
  if (!row.mission_partner) return false;
  if (!row.featured) return false;
  if (row.is_active === false) return false;
  const scope = String(row.sponsor_scope || "").trim().toLowerCase();
  if (scope === "podcast") return false;
  const status = String(row.sponsor_status || "active").trim().toLowerCase();
  if (["hidden", "archived", "draft", "inactive"].includes(status)) return false;
  return true;
}

/** Map catalog row → shape expected by `HomeSponsorBannerPlacements`. */
export function catalogRowToHomeSpotlight(row) {
  const merged = mergeSponsorCatalogRowWithSeed(row) || normalizeSponsorRecord(row);
  const vm = getSponsorCardViewModel(merged);
  const slug = canonicalSponsorHubSlug(vm.slug || vm.id || "");
  const presentation = getSponsorCardPresentation(slug);
  const seed = FEATURED_SPONSORS.find((s) => s.id === slug);
  const logoUrl =
    vm.logoUrl ||
    presentation.logoFallbackUrls?.[0] ||
    seed?.logoUrl ||
    "";
  const leadLine = String(merged.tagline || vm.cardSubheader || seed?.tagline || seed?.subtitle || "").trim();
  return {
    id: slug,
    slug,
    name: vm.name,
    logoUrl,
    backgroundImageUrl: vm.backgroundImageUrl || seed?.backgroundImageUrl || "",
    subtitle: leadLine,
    tagline: leadLine,
    tag: vm.primaryBadge?.label || vm.tag || seed?.tag || "Mission Partner",
    primaryDisplayTag: vm.primaryBadge?.label || seed?.primaryDisplayTag || "Mission Partner",
    mission_partner: true,
    featured: true,
  };
}

function buildHomepageSpotlightList(dbRows, limit) {
  const merged = mergeLiveHubCatalogWithStaticSeed(
    (Array.isArray(dbRows) ? dbRows : []).map((row) => normalizeSponsorRecord(row)),
  );
  const bySlug = new Map(merged.map((row) => [canonicalSponsorHubSlug(row.slug || row.id), row]));
  const sponsors = HOMEPAGE_SPOTLIGHT_SLUGS.map((slug) => bySlug.get(slug))
    .filter((row) => row && isHomepageFeaturedSponsorRow(row))
    .map((row) => catalogRowToHomeSpotlight(row));
  if (!sponsors.length) return seedHomepageFallback(limit);
  return sponsors.slice(0, limit);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient | null} admin
 * @param {{ limit?: number }} [opts]
 */
export async function fetchHomepageFeaturedSponsors(admin, opts = {}) {
  const limit = Math.min(Math.max(parseInt(String(opts.limit || 12), 10) || 12, 1), 24);
  if (!admin) {
    return { sponsors: seedHomepageFallback(limit), source: "seed" };
  }

  const { data, error } = await admin
    .from("sponsors_catalog")
    .select("*")
    .eq("is_active", true)
    .in("slug", [...HOMEPAGE_SPOTLIGHT_SLUGS, "game-day-mens-health"])
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return { sponsors: seedHomepageFallback(limit), source: "seed", warning: error.message };
  }

  const sponsors = buildHomepageSpotlightList(data, limit);
  const source = sponsors.length && (data || []).length ? "database" : "seed";

  return {
    sponsors,
    source,
  };
}

function seedHomepageFallback(limit) {
  return HOMEPAGE_SPOTLIGHT_SLUGS.map((id) => FEATURED_SPONSORS.find((s) => s.id === id))
    .filter(Boolean)
    .slice(0, limit)
    .map((s) => ({
      id: s.id,
      slug: s.id,
      name: s.name,
      logoUrl: s.logoUrl || "",
      backgroundImageUrl: s.backgroundImageUrl || "",
      subtitle: s.subtitle || s.tagline || "",
      tagline: s.tagline || s.subtitle || "",
      tag: s.tag || "Mission Partner",
      primaryDisplayTag: s.primaryDisplayTag || s.tag || "Mission Partner",
      mission_partner: true,
      featured: true,
    }));
}

/** Client-safe seed when `/api/sponsors/homepage-featured` is unreachable. */
export function getHomepageFeaturedSponsorSeed(limit = 12) {
  return seedHomepageFallback(limit);
}
