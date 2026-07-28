import {
  buildTrustedRowFromRegistrySlug,
  fetchTrustedResources,
  fetchTrustedResourcesFromSupabase,
} from "@/features/trusted-resources/api";
import { buildTrustedResourceDetailViewModel } from "@/features/trusted-resources/domain/trustedResourceDetailViewModel";
import { buildTrustedResourceViewModel } from "@/features/trusted-resources/domain/trustedResourceViewModel";
import { TRUSTED_RESOURCE_BY_SLUG } from "@/features/trusted-resources/trustedResourcesRegistry";
import {
  looksLikeEinDigits,
  looksLikeUuid,
  normalizeTrustedSlugParam,
} from "@/lib/trusted/trustedResourceSlug";
import { normalizeEin } from "@/lib/supabase/trustedResourcesCatalog";

/**
 * @param {unknown[]} rows
 * @param {string} slug
 */
/** Registry + curated detail profiles only (safe for CI/SSG without Supabase). */
export function buildTrustedResourceDetailFromRegistrySlug(slug) {
  const row = buildTrustedRowFromRegistrySlug(slug);
  if (!row) return null;
  const card = buildTrustedResourceViewModel(row);
  return buildTrustedResourceDetailViewModel(card, row);
}

/**
 * Resolve a detail row from an already-loaded catalog list.
 * Prefers slug match; falls back to catalog UUID or EIN when the route param is an id/EIN.
 */
export function resolveTrustedResourceDetailFromRows(rows, slug) {
  const key = normalizeTrustedSlugParam(slug);
  if (!key) return null;
  const list = Array.isArray(rows) ? rows : [];

  let row =
    list.find((r) => String(r.trustedResourceSlug || "").trim().toLowerCase() === key) || null;

  if (!row && looksLikeUuid(key)) {
    row = list.find((r) => String(r.catalogId || r.id || "").trim().toLowerCase() === key) || null;
  }

  if (!row && looksLikeEinDigits(key)) {
    const ein = normalizeEin(key);
    row = list.find((r) => normalizeEin(r.ein) === ein) || null;
  }

  if (!row) return null;
  const card = buildTrustedResourceViewModel(row);
  return buildTrustedResourceDetailViewModel(card, row);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {string} slug
 * @returns {Promise<{ detail: object | null, canonicalSlug: string, redirectedFrom: string | null }>}
 */
export async function getTrustedResourceDetailForSlug(supabase, slug) {
  const key = normalizeTrustedSlugParam(slug);
  if (!key) {
    return { detail: null, canonicalSlug: "", redirectedFrom: null };
  }

  const wrap = (detail, redirectedFrom = null) => {
    const canonicalSlug = String(detail?.trustedResourceSlug || "").trim().toLowerCase() || key;
    return { detail, canonicalSlug, redirectedFrom };
  };

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
          const detail = buildTrustedResourceDetailViewModel(card, data.row);
          const canonical = String(data.canonicalSlug || detail?.trustedResourceSlug || key)
            .trim()
            .toLowerCase();
          return wrap(detail, canonical !== key ? key : null);
        }
      }
      if (res.status === 404) {
        /* fall through to local/registry */
      }
    } catch (err) {
      if (typeof console !== "undefined") {
        console.warn("[trusted-detail] catalog fetch failed", { slug: key, err: String(err?.message || err) });
      }
    }
    const rows = await fetchTrustedResources(supabase);
    const live = resolveTrustedResourceDetailFromRows(rows, key);
    if (live) {
      const canonical = String(live.trustedResourceSlug || "").trim().toLowerCase();
      return wrap(live, canonical && canonical !== key ? key : null);
    }
    const registry = buildTrustedResourceDetailFromRegistrySlug(key);
    return wrap(registry, null);
  }

  try {
    const rows = await fetchTrustedResourcesFromSupabase(supabase);
    const live = resolveTrustedResourceDetailFromRows(rows, key);
    if (live) {
      const canonical = String(live.trustedResourceSlug || "").trim().toLowerCase();
      return wrap(live, canonical && canonical !== key ? key : null);
    }
  } catch (err) {
    if (typeof console !== "undefined") {
      console.warn("[trusted-detail] supabase catalog failed", { slug: key, err: String(err?.message || err) });
    }
  }

  if (TRUSTED_RESOURCE_BY_SLUG[key]) {
    return wrap(buildTrustedResourceDetailFromRegistrySlug(key), null);
  }

  return wrap(null, null);
}

/** @deprecated Use `getTrustedResourceDetailForSlug` — returns detail only for older callers. */
export async function getTrustedResourceBySlug(supabase, slug) {
  const { detail } = await getTrustedResourceDetailForSlug(supabase, slug);
  return detail;
}

export function listTrustedResourceSlugs() {
  return Object.keys(TRUSTED_RESOURCE_BY_SLUG);
}
