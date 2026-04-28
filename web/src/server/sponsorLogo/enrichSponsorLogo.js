import { readImageDimensions } from "@/lib/image/readImageDimensions";
import { buildOrderedSponsorLogoCandidates } from "@/lib/sponsors/logoDiscoveryServer";

const TABLE = "sponsors_catalog";
const DEFAULT_BUCKET = "sponsor-logos";

function clean(value) {
  return String(value ?? "").trim();
}

function storageKeySlug(slug) {
  return String(slug || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80) || "sponsor";
}

function isProbablyIco(buf) {
  return buf.length >= 8 && buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0;
}

/**
 * @param {Buffer} buf
 * @param {string} sourceType
 * @param {string} sourceUrl
 */
export function validateSponsorLogoBuffer(buf, sourceType, sourceUrl) {
  if (!buf || buf.length < 120) return false;
  if (buf.length > 3_500_000) return false;

  const url = String(sourceUrl || "").toLowerCase();
  const ctHint = sourceType === "site_favicon" || url.endsWith(".ico");

  if (isProbablyIco(buf) || ctHint) {
    return buf.length >= 200;
  }

  const dim = readImageDimensions(buf);
  if (!dim) return false;
  const r = dim.w / dim.h;
  if (r > 4.2 || r < 0.22) return false;
  if (Math.min(dim.w, dim.h) < 36) return false;
  if (Math.max(dim.w, dim.h) > 3600) return false;
  if (sourceType === "og_image_logo_hint" && r > 2.65) return false;
  return true;
}

function extForType(ct) {
  const t = String(ct || "").toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  if (t.includes("gif")) return "gif";
  if (t.includes("x-icon") || t.includes("ico")) return "ico";
  return "jpg";
}

/**
 * @param {string} url
 * @returns {Promise<{ buf: Buffer, contentType: string }>}
 */
export async function downloadSponsorLogoBytes(url) {
  const raw = clean(url);
  if (!/^https?:\/\//i.test(raw)) throw new Error("invalid_logo_url");

  const res = await fetch(raw, {
    redirect: "follow",
    headers: { "user-agent": "TOP-SponsorLogoEnrichment/1.0" },
  });
  if (!res.ok) throw new Error(`download_${res.status}`);

  const ct = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (ct.includes("svg")) throw new Error("svg_not_supported");

  const buf = Buffer.from(await res.arrayBuffer());
  let contentType = ct;
  if (!/^image\//i.test(contentType)) {
    if (isProbablyIco(buf)) contentType = "image/x-icon";
    else if (readImageDimensions(buf)) contentType = "image/jpeg";
    else throw new Error("not_image");
  }

  return { buf, contentType };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} slugKey
 * @param {Buffer} buf
 * @param {string} contentType
 */
export async function uploadSponsorLogoToBucket(supabase, slugKey, buf, contentType) {
  const bucket = clean(process.env.SPONSOR_LOGO_BUCKET) || DEFAULT_BUCKET;
  const key = storageKeySlug(slugKey);
  const ext = extForType(contentType);
  const path = `${key}/logo.${ext}`;
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

function isLogoLocked(row, force) {
  if (force) return false;
  const st = clean(row?.logo_status).toLowerCase();
  const rv = clean(row?.logo_review_status).toLowerCase();
  if (rv === "curated" || st === "curated") return true;
  if (rv === "approved" && st === "approved") return true;
  return false;
}

/** Pre-pipeline rows: logo_url set but no logo_* workflow — do not overwrite without force. */
function hasLegacyLogoWithoutPipeline(row) {
  return !!clean(row?.logo_url) && !clean(row?.logo_status) && !clean(row?.logo_review_status);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} slug
 * @param {{ force?: boolean }} [opts]
 */
export async function enrichSponsorLogoForSlug(supabase, slug, opts = {}) {
  const slugClean = clean(slug);
  if (!slugClean) return { ok: false, error: "missing_slug" };

  const { data: row, error: loadErr } = await supabase.from(TABLE).select("*").eq("slug", slugClean).maybeSingle();
  if (loadErr) return { ok: false, error: loadErr.message };
  if (!row) return { ok: false, error: "not_found" };

  if (isLogoLocked(row, !!opts.force)) {
    return { ok: false, error: "locked_curated_or_approved", slug: slugClean };
  }

  if (!opts.force && hasLegacyLogoWithoutPipeline(row)) {
    return { ok: true, slug: slugClean, outcome: "skipped_legacy_logo" };
  }

  const website = clean(row.website_url);
  const nowIso = new Date().toISOString();

  if (!website) {
    const patch = {
      logo_last_enriched_at: nowIso,
      updated_at: nowIso,
      logo_notes: "No website_url on sponsor row; cannot discover official logo.",
    };
    if (!clean(row.logo_url)) {
      patch.logo_status = "fallback";
      patch.logo_review_status = "pending_review";
    }
    await supabase.from(TABLE).update(patch).eq("slug", slugClean);
    return { ok: true, slug: slugClean, outcome: "no_website" };
  }

  let html = "";
  let finalUrl = website;
  try {
    const res = await fetch(/^https?:\/\//i.test(website) ? website : `https://${website}`, {
      redirect: "follow",
      headers: { "user-agent": "TOP-SponsorLogoEnrichment/1.0" },
    });
    if (!res.ok) throw new Error(`fetch_${res.status}`);
    finalUrl = res.url || website;
    html = await res.text();
  } catch (e) {
    const patch = {
      logo_last_enriched_at: nowIso,
      updated_at: nowIso,
      logo_notes: `Website fetch failed (${String(e?.message || e)}).`,
    };
    if (!clean(row.logo_url)) {
      patch.logo_status = "fallback";
      patch.logo_review_status = "pending_review";
    }
    await supabase.from(TABLE).update(patch).eq("slug", slugClean);
    return { ok: true, slug: slugClean, outcome: "fetch_failed" };
  }

  const candidates = buildOrderedSponsorLogoCandidates(html, finalUrl);
  let chosen = null;
  let chosenSource = "";
  let chosenUrl = "";
  let lastErr = "";

  for (const c of candidates) {
    try {
      const { buf, contentType } = await downloadSponsorLogoBytes(c.url);
      if (!validateSponsorLogoBuffer(buf, c.sourceType, c.url)) {
        lastErr = "validation_failed";
        continue;
      }
      chosen = { buf, contentType };
      chosenSource = c.sourceType;
      chosenUrl = c.url;
      break;
    } catch (e) {
      lastErr = String(e?.message || e);
    }
  }

  if (!chosen) {
    const patch = {
      logo_last_enriched_at: nowIso,
      updated_at: nowIso,
      logo_notes: `No passing logo candidate (${lastErr || "exhausted"}).`,
    };
    if (!clean(row.logo_url)) {
      patch.logo_status = "fallback";
      patch.logo_review_status = "pending_review";
    }
    await supabase.from(TABLE).update(patch).eq("slug", slugClean);
    return { ok: true, slug: slugClean, outcome: "no_valid_logo" };
  }

  let publicUrl = "";
  let storedAs = "storage";
  let uploadErrorMessage = "";
  try {
    const up = await uploadSponsorLogoToBucket(supabase, slugClean, chosen.buf, chosen.contentType);
    publicUrl = up.publicUrl;
  } catch (e) {
    storedAs = "remote_hotlink";
    publicUrl = chosenUrl;
    uploadErrorMessage = String(e?.message || e);
  }

  const patch = {
    logo_url: publicUrl,
    logo_source_url: chosenUrl,
    logo_source_type: storedAs === "storage" ? chosenSource : `${chosenSource}_hotlink_fallback`,
    logo_status: "found",
    logo_review_status: "pending_review",
    logo_notes:
      storedAs === "remote_hotlink"
        ? `Storage upload failed (${uploadErrorMessage}); using verified source URL until re-run.`
        : `Enriched from official site (${chosenSource}).`,
    logo_last_enriched_at: nowIso,
    updated_at: nowIso,
  };

  const { error: upErr } = await supabase.from(TABLE).update(patch).eq("slug", slugClean);
  if (upErr) return { ok: false, error: upErr.message };

  return {
    ok: true,
    slug: slugClean,
    outcome: "enriched",
    logo_url: publicUrl,
    logo_source_url: chosenUrl,
    storedAs,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ limit?: number, delayMs?: number, force?: boolean }} opts
 */
export async function batchEnrichSponsorLogos(supabase, opts = {}) {
  const limit = Math.min(40, Math.max(1, Number(opts.limit) || 8));
  const delayMs = Math.min(5000, Math.max(0, Number(opts.delayMs) || 450));

  const { data: rows, error } = await supabase
    .from(TABLE)
    .select("slug,website_url,logo_url,logo_status,logo_review_status")
    .not("website_url", "is", null)
    .limit(120);

  if (error) return { ok: false, error: error.message, results: [] };

  const candidates = (rows || []).filter((r) => {
    if (isLogoLocked(r, !!opts.force)) return false;
    if (!opts.force && hasLegacyLogoWithoutPipeline(r)) return false;
    const url = clean(r.logo_url);
    const st = clean(r.logo_status).toLowerCase();
    if (url && (st === "found" || st === "approved" || st === "curated")) return false;
    return true;
  });

  const slice = candidates.slice(0, limit);
  const results = [];
  for (const r of slice) {
    const out = await enrichSponsorLogoForSlug(supabase, r.slug, { force: !!opts.force });
    results.push(out);
    if (delayMs > 0) await new Promise((res) => setTimeout(res, delayMs));
  }
  return { ok: true, results };
}
