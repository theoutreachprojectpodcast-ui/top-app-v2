import { getSponsorCardViewModel } from "@/features/sponsors/domain/sponsorViewModels";
import { canonicalSponsorHubSlug } from "@/features/sponsors/api/sponsorCatalogApi";
import { FEATURED_SPONSORS } from "@/features/sponsors/data/featuredSponsors";

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
  const vm = getSponsorCardViewModel(row);
  const slug = canonicalSponsorHubSlug(vm.slug || vm.id || "");
  return {
    id: slug,
    slug,
    name: vm.name,
    logoUrl: vm.logoUrl || "",
    backgroundImageUrl: vm.backgroundImageUrl || vm.cardBackground || "",
    subtitle: vm.tagline || vm.cardSubheader || "",
    tagline: vm.tagline || "",
    tag: vm.primaryBadge?.label || vm.tag || "Mission Partner",
    primaryDisplayTag: vm.primaryBadge?.label || "Mission Partner",
    mission_partner: true,
    featured: true,
  };
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
    .eq("mission_partner", true)
    .eq("featured", true)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    return { sponsors: seedHomepageFallback(limit), source: "seed", warning: error.message };
  }

  const rows = (data || []).filter(isHomepageFeaturedSponsorRow);
  if (!rows.length) {
    return { sponsors: seedHomepageFallback(limit), source: "seed" };
  }

  return {
    sponsors: rows.map(catalogRowToHomeSpotlight),
    source: "database",
  };
}

function seedHomepageFallback(limit) {
  const ids = ["gameday-mens-health", "rope-solutions", "apex-global-outdoors"];
  return ids
    .map((id) => FEATURED_SPONSORS.find((s) => s.id === id))
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
