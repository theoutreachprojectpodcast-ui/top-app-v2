import { fetchTrustedResources } from "@/features/trusted-resources/api";
import { buildTrustedResourceDetailViewModel } from "@/features/trusted-resources/domain/trustedResourceDetailViewModel";
import { buildTrustedResourceViewModel } from "@/features/trusted-resources/domain/trustedResourceViewModel";
import { TRUSTED_RESOURCE_BY_SLUG } from "@/features/trusted-resources/trustedResourcesRegistry";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {string} slug
 */
export async function getTrustedResourceBySlug(supabase, slug) {
  const key = String(slug || "").trim().toLowerCase();
  if (!key || !TRUSTED_RESOURCE_BY_SLUG[key]) return null;

  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/trusted/catalog?slug=${encodeURIComponent(key)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data.row) {
          const card = buildTrustedResourceViewModel(data.row);
          return buildTrustedResourceDetailViewModel(card, data.row);
        }
      }
    } catch {
      /* fall through */
    }
  }

  const rows = await fetchTrustedResources(supabase);
  const row =
    rows.find((r) => String(r.trustedResourceSlug || "").trim().toLowerCase() === key) || null;
  if (!row) return null;
  const card = buildTrustedResourceViewModel(row);
  return buildTrustedResourceDetailViewModel(card, row);
}

export function listTrustedResourceSlugs() {
  return Object.keys(TRUSTED_RESOURCE_BY_SLUG);
}
