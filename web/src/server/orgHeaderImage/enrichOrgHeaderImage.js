import { researchOfficialWebsite } from "@/features/nonprofits/enrichment/researchOfficialWebsite";
import { verifyEnrichmentAgainstRecord } from "@/features/nonprofits/verification/verifyEnrichment";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";

const DEFAULT_BUCKET = "org-header-images";

function clean(value) {
  return String(value ?? "").trim();
}

function imageTypeFromMagic(buf) {
  if (!buf?.length || buf.length < 12) return "";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  if (buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  return "";
}

function extForType(ct) {
  const t = String(ct || "").toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  if (t.includes("gif")) return "gif";
  return "jpg";
}

/**
 * @param {string} url
 * @returns {Promise<{ buf: Buffer, contentType: string }>}
 */
export async function downloadRemoteImage(url) {
  const raw = clean(url);
  if (!/^https?:\/\//i.test(raw)) throw new Error("invalid_image_url");

  const res = await fetch(raw, {
    redirect: "follow",
    headers: { "user-agent": "TOP-OrgHeaderEnrichment/1.1" },
  });
  if (!res.ok) throw new Error(`download_status_${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 400) throw new Error("image_too_small");
  if (buf.length > 6_000_000) throw new Error("image_too_large");

  let contentType = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!/^image\//i.test(contentType)) {
    const magic = imageTypeFromMagic(buf);
    if (magic) contentType = magic;
    else throw new Error("not_image_content_type");
  }

  return { buf, contentType };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} ein9
 * @param {Buffer} buf
 * @param {string} contentType
 * @returns {Promise<{ publicUrl: string, path: string }>}
 */
export async function uploadHeaderToOrgBucket(supabase, ein9, buf, contentType) {
  const bucket = clean(process.env.ORG_HEADER_IMAGE_BUCKET) || DEFAULT_BUCKET;
  const ext = extForType(contentType);
  const path = `${ein9}/header.${ext}`;
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, buf, {
    contentType,
    upsert: true,
  });
  if (upErr) throw new Error(upErr.message || "storage_upload_failed");

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = clean(pub?.publicUrl);
  if (!publicUrl) throw new Error("storage_public_url_missing");
  return { publicUrl, path };
}

function isEnrichmentLocked(row, force) {
  if (force) return false;
  const st = clean(row?.header_image_status).toLowerCase();
  const rv = clean(row?.header_image_review_status).toLowerCase();
  if (st === "curated" || rv === "curated") return true;
  if (rv === "approved" && st === "approved") return true;
  return false;
}

/**
 * @param {object} params
 * @param {import("@supabase/supabase-js").SupabaseClient} params.supabase
 * @param {string} params.ein
 * @param {string} [params.canonicalName]
 * @param {string} [params.recordWebsite]
 * @param {boolean} [params.force]
 */
export async function enrichOrgHeaderImageForEin(params) {
  const supabase = params.supabase;
  const ein9 = normalizeEinDigits(params.ein);
  if (ein9.length !== 9) return { ok: false, error: "invalid_ein" };

  let { data: existing, error: loadErr } = await supabase
    .from("nonprofit_directory_enrichment")
    .select("*")
    .eq("ein", ein9)
    .maybeSingle();

  if (loadErr) return { ok: false, error: loadErr.message };

  if (!existing) {
    const { data: org } = await supabase
      .from("nonprofits_search_app_v1")
      .select("ein,org_name,name,website")
      .or(`ein.eq.${ein9},ein.eq.${ein9.slice(0, 2)}-${ein9.slice(2)}`)
      .maybeSingle();
    if (!org) {
      return { ok: false, error: "no_enrichment_row", ein: ein9, hint: "No directory org row for this EIN." };
    }
    const seed = {
      ein: ein9,
      website_url: clean(org.website) || null,
      irs_name: clean(org.org_name || org.name) || null,
      updated_at: new Date().toISOString(),
    };
    const { error: seedErr } = await supabase.from("nonprofit_directory_enrichment").upsert(seed, { onConflict: "ein" });
    if (seedErr) return { ok: false, error: seedErr.message };
    const reload = await supabase.from("nonprofit_directory_enrichment").select("*").eq("ein", ein9).maybeSingle();
    existing = reload.data;
    if (!existing) return { ok: false, error: "enrichment_seed_failed", ein: ein9 };
  }

  if (isEnrichmentLocked(existing, !!params.force)) {
    return { ok: false, error: "locked_curated_or_approved", ein: ein9 };
  }

  const canonicalName = clean(params.canonicalName) || clean(existing.canonical_display_name) || clean(existing.display_name_on_site) || `EIN ${ein9}`;
  let recordWebsite = clean(params.recordWebsite) || clean(existing.website_url);

  if (!recordWebsite) {
    const { data: org } = await supabase
      .from("nonprofits_search_app_v1")
      .select("website,org_name,name")
      .or(`ein.eq.${ein9},ein.eq.${ein9.slice(0, 2)}-${ein9.slice(2)}`)
      .maybeSingle();
    recordWebsite = clean(org?.website);
  }

  const nowIso = new Date().toISOString();

  if (!recordWebsite) {
    const notes = "No website URL on enrichment or directory row; cannot research official imagery.";
    await supabase
      .from("nonprofit_directory_enrichment")
      .update({
        header_image_status: "fallback",
        header_image_review_status: "pending_review",
        header_image_notes: notes,
        header_image_last_enriched_at: nowIso,
        updated_at: nowIso,
      })
      .eq("ein", ein9);
    return { ok: true, ein: ein9, outcome: "no_website", notes };
  }

  const research = await researchOfficialWebsite({ recordWebsite });
  if (!research.ok) {
    const notes = `Website research failed (${research.error || "unknown"}).`;
    await supabase
      .from("nonprofit_directory_enrichment")
      .update({
        header_image_status: "rejected",
        header_image_review_status: "pending_review",
        header_image_notes: notes,
        header_image_last_enriched_at: nowIso,
        updated_at: nowIso,
      })
      .eq("ein", ein9);
    return { ok: true, ein: ein9, outcome: "research_failed", notes };
  }

  const verification = verifyEnrichmentAgainstRecord(
    {
      canonicalName,
      recordWebsite,
      fetchFinalUrl: research.fetchFinalUrl,
    },
    research.extracted
  );

  const remoteUrl = clean(verification.verified?.hero_image_url);
  if (!verification.ok || !remoteUrl) {
    const notes = `Verification did not approve a hero image (${(verification.notes || []).slice(0, 4).join(", ") || "no_hero"}).`;
    await supabase
      .from("nonprofit_directory_enrichment")
      .update({
        header_image_status: "rejected",
        header_image_review_status: "pending_review",
        header_image_notes: notes,
        header_image_last_enriched_at: nowIso,
        updated_at: nowIso,
      })
      .eq("ein", ein9);
    return { ok: true, ein: ein9, outcome: "verification_rejected", notes, verificationNotes: verification.notes };
  }

  const tw = clean(research.extracted?.twitterImage);
  const og = clean(research.extracted?.ogImage);
  const sourceType =
    remoteUrl && tw && remoteUrl === tw ? "official_site_twitter" : remoteUrl && og && remoteUrl === og ? "official_site_og" : "official_site_meta";

  let publicUrl = "";
  let storagePath = "";
  let storedAs = "storage";
  let uploadErrorMessage = "";

  try {
    const { buf, contentType } = await downloadRemoteImage(remoteUrl);
    const up = await uploadHeaderToOrgBucket(supabase, ein9, buf, contentType);
    publicUrl = up.publicUrl;
    storagePath = up.path;
  } catch (e) {
    storedAs = "remote_hotlink";
    publicUrl = remoteUrl;
    storagePath = "";
    uploadErrorMessage = String(e?.message || e);
  }

  const patch = {
    header_image_url: publicUrl,
    header_image_source_url: remoteUrl,
    header_image_source_type: storedAs === "storage" ? sourceType : `${sourceType}_hotlink_fallback`,
    header_image_status: "found",
    header_image_review_status: "pending_review",
    header_image_notes:
      storedAs === "remote_hotlink"
        ? `Storage upload failed (${uploadErrorMessage}); using verified remote URL until re-run.`
        : `Enriched from official site (${sourceType}).`,
    header_image_last_enriched_at: nowIso,
    hero_image_url: clean(existing.hero_image_url) || publicUrl,
    thumbnail_url: clean(existing.thumbnail_url) || publicUrl,
    updated_at: nowIso,
  };

  const { error: upErr } = await supabase.from("nonprofit_directory_enrichment").update(patch).eq("ein", ein9);
  if (upErr) return { ok: false, error: upErr.message };

  return {
    ok: true,
    ein: ein9,
    outcome: "enriched",
    header_image_url: publicUrl,
    header_image_source_url: remoteUrl,
    storagePath,
    storedAs,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ limit?: number, delayMs?: number, force?: boolean }} opts
 */
export async function batchEnrichOrgHeaderImages(supabase, opts = {}) {
  const limit = Math.min(50, Math.max(1, Number(opts.limit) || 10));
  const delayMs = Math.min(5000, Math.max(0, Number(opts.delayMs) || 400));

  const { data: rows, error } = await supabase
    .from("nonprofit_directory_enrichment")
    .select("ein,website_url,canonical_display_name,display_name_on_site,header_image_status,header_image_review_status,header_image_url")
    .not("website_url", "is", null)
    .limit(Math.max(80, limit * 8));

  if (error) return { ok: false, error: error.message, results: [] };

  const candidates = (rows || []).filter((r) => {
    const ein9 = normalizeEinDigits(r.ein);
    if (ein9.length !== 9) return false;
    if (isEnrichmentLocked(r, !!opts.force)) return false;
    const url = clean(r.header_image_url);
    const st = clean(r.header_image_status).toLowerCase();
    if (url && (st === "found" || st === "approved" || st === "curated")) return false;
    return true;
  });

  const slice = candidates.slice(0, limit);
  const results = [];

  for (const row of slice) {
    const r = await enrichOrgHeaderImageForEin({
      supabase,
      ein: row.ein,
      canonicalName: clean(row.canonical_display_name) || clean(row.display_name_on_site),
      recordWebsite: clean(row.website_url),
      force: !!opts.force,
    });
    results.push(r);
    if (delayMs > 0) await new Promise((res) => setTimeout(res, delayMs));
  }

  return { ok: true, results };
}
