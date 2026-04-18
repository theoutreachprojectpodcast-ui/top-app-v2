import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { enrichNonprofitProfile } from "@/features/nonprofits/enrichment/enrichNonprofitProfile";

const DIRECTORY_SOURCE = "nonprofits_search_app_v1";
const ENRICHMENT_TABLE = "nonprofit_directory_enrichment";
const PROFILE_FALLBACK_TABLE = "nonprofit_profiles";

function orgDisplayName(org) {
  return String(org?.org_name ?? org?.name ?? org?.NAME ?? "").trim();
}

function orgWebsite(org) {
  return String(org?.website ?? org?.Website ?? "").trim();
}

function orgState(org) {
  return String(org?.state ?? org?.STATE ?? "").trim();
}

function orgLegalName(org) {
  return String(org?.legal_name ?? org?.organization_name ?? org?.org_name ?? "").trim();
}

function orgIrsName(org) {
  return String(org?.irs_name ?? org?.org_name ?? org?.name ?? org?.NAME ?? "").trim();
}

function mergeDefined(base, patch) {
  const out = { ...(base && typeof base === "object" ? base : {}) };
  for (const [k, v] of Object.entries(patch || {})) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

async function upsertEnrichmentMerged(supabase, ein9, patch) {
  const { data: existing, error: readErr } = await supabase
    .from(ENRICHMENT_TABLE)
    .select("*")
    .eq("ein", ein9)
    .maybeSingle();
  if (readErr) return { error: readErr };
  const merged = mergeDefined(existing, { ...patch, ein: ein9, updated_at: new Date().toISOString() });
  return supabase.from(ENRICHMENT_TABLE).upsert(merged, { onConflict: "ein" });
}

function isMissingTable(error) {
  return String(error?.code || "") === "PGRST205";
}

async function upsertProfileFallback(supabase, ein9, patch) {
  const { data: existing, error: readErr } = await supabase
    .from(PROFILE_FALLBACK_TABLE)
    .select("*")
    .eq("ein", ein9)
    .maybeSingle();
  if (readErr) return { error: readErr };
  if (!existing) return { error: null, skipped: true };

  const candidateName = String(
    patch.canonical_display_name || patch.website_verified_name || patch.display_name_on_site || ""
  ).trim();

  const next = { ...existing };
  if ("display_name_override" in existing && candidateName) next.display_name_override = candidateName;
  if ("website" in existing && patch.website_url) next.website = patch.website_url;
  if ("website_url" in existing && patch.website_url) next.website_url = patch.website_url;
  if ("logo_url" in existing && patch.logo_url) next.logo_url = patch.logo_url;
  if ("facebook_url" in existing && patch.facebook_url) next.facebook_url = patch.facebook_url;
  if ("instagram_url" in existing && patch.instagram_url) next.instagram_url = patch.instagram_url;
  if ("youtube_url" in existing && patch.youtube_url) next.youtube_url = patch.youtube_url;
  if ("x_url" in existing && patch.x_url) next.x_url = patch.x_url;
  if ("linkedin_url" in existing && patch.linkedin_url) next.linkedin_url = patch.linkedin_url;
  if ("updated_at" in existing) next.updated_at = new Date().toISOString();

  return supabase.from(PROFILE_FALLBACK_TABLE).update(next).eq("ein", ein9);
}

async function loadDirectoryOrg(supabase, ein9) {
  const dashed = `${ein9.slice(0, 2)}-${ein9.slice(2)}`;
  let { data, error } = await supabase.from(DIRECTORY_SOURCE).select("*").eq("ein", ein9).maybeSingle();
  if (error) return { org: null, error };
  if (data) return { org: data, error: null };
  ({ data, error } = await supabase.from(DIRECTORY_SOURCE).select("*").eq("ein", dashed).maybeSingle());
  if (error) return { org: null, error };
  return { org: data, error: null };
}

/**
 * POST { ein: string }
 * Loads canonical directory row, runs website enrichment + verification, optionally upserts nonprofit_directory_enrichment.
 */
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const ein9 = normalizeEinDigits(body.ein);
  if (ein9.length !== 9) {
    return NextResponse.json({ ok: false, error: "invalid_ein" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { org, error: orgErr } = await loadDirectoryOrg(supabase, ein9);
  if (orgErr) {
    return NextResponse.json({ ok: false, error: "lookup_failed", detail: orgErr.message }, { status: 500 });
  }
  if (!org) {
    return NextResponse.json({ ok: false, error: "org_not_found" }, { status: 404 });
  }

  const canonicalName = orgDisplayName(org);
  const recordWebsite = orgWebsite(org);
  const pipeline = await enrichNonprofitProfile({
    ein: ein9,
    canonicalName: canonicalName || `EIN ${ein9}`,
    recordWebsite,
    state: orgState(org),
    legalName: orgLegalName(org),
    irsName: orgIrsName(org),
    approvedName: String(org?.approved_name ?? "").trim(),
    verifiedName: String(org?.verified_name ?? "").trim(),
  });

  if (!pipeline.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: pipeline.error || "enrichment_failed",
        fetch: pipeline.fetch ? { ok: pipeline.fetch.ok, error: pipeline.fetch.error } : null,
      },
      { status: 502 }
    );
  }

  const row = pipeline.enrichmentRow ? { ...pipeline.enrichmentRow, ein: ein9 } : null;
  let persistError = null;
  let persisted = false;

  if (serviceKey) {
    if (row && pipeline.verified) {
      const { error: upErr } = await upsertEnrichmentMerged(supabase, ein9, row);
      if (upErr && isMissingTable(upErr)) {
        const { error: fallbackErr, skipped } = await upsertProfileFallback(supabase, ein9, row);
        persistError = fallbackErr;
        if (!fallbackErr && !skipped) persisted = true;
      } else {
        persistError = upErr;
        if (!upErr) persisted = true;
      }
    } else if (pipeline.researchMeta?.research_status) {
      const { error: upErr } = await upsertEnrichmentMerged(supabase, ein9, {
        research_status: pipeline.researchMeta.research_status,
        research_confidence: pipeline.researchMeta.research_confidence ?? null,
        source_summary: pipeline.researchMeta.source_summary ?? null,
        web_search_supplemented: !!pipeline.researchMeta.web_search_supplemented,
        profile_enriched_at: new Date().toISOString(),
      });
      if (upErr && isMissingTable(upErr)) {
        persistError = null;
      } else {
        persistError = upErr;
        if (!upErr) persisted = true;
      }
    }
  }

  if (persistError) {
    return NextResponse.json(
      { ok: false, error: "persist_failed", detail: persistError.message },
      { status: 500 }
    );
  }

  const reason = pipeline.reason || null;

  return NextResponse.json({
    ok: true,
    verified: !!pipeline.verified,
    reason,
    persisted,
    enrichmentRow: row,
    verificationNotes: pipeline.verification?.notes || [],
    confidence: pipeline.verification?.confidence ?? pipeline.researchMeta?.research_confidence ?? null,
    researchMeta: pipeline.researchMeta || null,
  });
}
