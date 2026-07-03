import { listSponsorsCatalogWithClient, mergeLivePodcastCatalogWithStaticSeed } from "@/features/sponsors/api/sponsorCatalogApi";
import { normalizeSponsorRecord } from "@/features/sponsors/domain/sponsorViewModels";

async function fetchPodcastSponsorsCatalogFromApi() {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/podcasts/sponsors/catalog", { credentials: "include", cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.rows)) return null;
    return mergeLivePodcastCatalogWithStaticSeed(data.rows.map((r) => normalizeSponsorRecord(r)));
  } catch {
    return null;
  }
}

/**
 * Podcast program sponsor roster only (`/podcasts`). Does not call `/api/sponsors/catalog`.
 * @param {import("@supabase/supabase-js").SupabaseClient | null} supabase
 */
export async function listPodcastSponsorsCatalog(supabase) {
  const fromApi = await fetchPodcastSponsorsCatalogFromApi();
  if (Array.isArray(fromApi) && fromApi.length > 0) return fromApi;
  return listSponsorsCatalogWithClient(supabase, { sponsorScope: "podcast" });
}
