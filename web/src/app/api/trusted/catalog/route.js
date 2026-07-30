import { createSupabaseReadClient } from "@/lib/supabase/readServiceClient";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchTrustedResourcesFromSupabase } from "@/features/trusted-resources/api";
import { buildTrustedResourceDetailViewModel } from "@/features/trusted-resources/domain/trustedResourceDetailViewModel";
import { buildTrustedResourceViewModel } from "@/features/trusted-resources/domain/trustedResourceViewModel";
import {
  TRUSTED_RESOURCE_BY_SLUG,
  TRUSTED_RESOURCE_CANONICAL_RECORDS,
} from "@/features/trusted-resources/trustedResourcesRegistry";
import { buildTrustedRowFromRegistrySlug } from "@/features/trusted-resources/api";
import {
  looksLikeEinDigits,
  looksLikeUuid,
  normalizeTrustedSlugParam,
} from "@/lib/trusted/trustedResourceSlug";
import { normalizeEin, TRUSTED_RESOURCES_TABLE } from "@/lib/supabase/trustedResourcesCatalog";
import { requireMembershipApi } from "@/lib/membership/membershipRouteGuard";

export const runtime = "nodejs";

function findRowInList(rows, key) {
  const list = Array.isArray(rows) ? rows : [];
  let row = list.find((r) => String(r.trustedResourceSlug || "").trim().toLowerCase() === key) || null;
  if (!row && looksLikeUuid(key)) {
    row = list.find((r) => String(r.catalogId || r.id || "").trim().toLowerCase() === key) || null;
  }
  if (!row && looksLikeEinDigits(key)) {
    const ein = normalizeEin(key);
    row = list.find((r) => normalizeEin(r.ein) === ein) || null;
  }
  return row;
}

async function resolveAliasSlug(admin, key) {
  if (!admin || !key) return null;
  try {
    const { data } = await admin
      .from("trusted_resource_slug_aliases")
      .select("trusted_resource_id, legacy_slug")
      .eq("legacy_slug", key)
      .maybeSingle();
    if (!data?.trusted_resource_id) return null;
    const { data: tr } = await admin
      .from(TRUSTED_RESOURCES_TABLE)
      .select("slug, listing_status")
      .eq("id", data.trusted_resource_id)
      .maybeSingle();
    const slug = String(tr?.slug || "").trim().toLowerCase();
    if (!slug) return null;
    if (String(tr?.listing_status || "").toLowerCase() === "archived") return null;
    return slug;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const admin = createSupabaseAdminClient();
  if (admin) {
    const membership = await requireMembershipApi(admin, "trusted_pro");
    if (!membership.ok) return membership.response;
  }

  const supabase = createSupabaseReadClient();
  const slug = normalizeTrustedSlugParam(new URL(request.url).searchParams.get("slug") || "");

  try {
    const rows = await fetchTrustedResourcesFromSupabase(supabase);

    if (slug) {
      let row = findRowInList(rows, slug);
      let redirectedFrom = null;
      let canonicalSlug = String(row?.trustedResourceSlug || "").trim().toLowerCase();

      if (!row && admin) {
        const aliasTarget = await resolveAliasSlug(admin, slug);
        if (aliasTarget) {
          redirectedFrom = slug;
          row = findRowInList(rows, aliasTarget);
          canonicalSlug = aliasTarget;
        }
      }

      if (!row && TRUSTED_RESOURCE_BY_SLUG[slug]) {
        const registryRow = buildTrustedRowFromRegistrySlug(slug);
        if (registryRow) {
          const card = buildTrustedResourceViewModel(registryRow);
          const detail = buildTrustedResourceDetailViewModel(card, registryRow);
          return Response.json({
            ok: true,
            row: registryRow,
            detail,
            canonicalSlug: slug,
            source: "registry",
          });
        }
      }

      if (!row) {
        return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      }

      const card = buildTrustedResourceViewModel(row);
      const detail = buildTrustedResourceDetailViewModel(card, row);
      canonicalSlug = String(row.trustedResourceSlug || canonicalSlug || slug).trim().toLowerCase();
      return Response.json({
        ok: true,
        row,
        detail,
        canonicalSlug,
        redirectedFrom: redirectedFrom || (canonicalSlug !== slug ? slug : null),
      });
    }

    if (!supabase) {
      return Response.json({
        ok: true,
        rows,
        warning: "missing_supabase",
        message:
          "Set NEXT_PUBLIC_SUPABASE_URL plus anon or SUPABASE_SERVICE_ROLE_KEY for full catalog + directory enrichment.",
        registryCount: TRUSTED_RESOURCE_CANONICAL_RECORDS.length,
      });
    }
    return Response.json({ ok: true, rows });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
