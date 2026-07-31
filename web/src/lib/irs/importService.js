import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { DEFAULT_SUBSECTION_FILTER, classificationSummary, subsectionLabel } from "@/lib/irs/classification";
import { loadMatchingOrganizations } from "@/lib/irs/eoBmfClient";
import { nameLocationKey } from "@/lib/irs/normalizeRecord";

const IRS_TABLE = "irs_eo_organizations";
const BATCH_TABLE = "irs_nonprofit_import_batches";
const ERROR_TABLE = "irs_nonprofit_import_errors";
const DIRECTORY_TABLE = "nonprofits_search_app_v1";

/** Profile / curated fields we never overwrite when the existing value is non-empty. */
const CURATED_DIRECTORY_FIELDS = ["website", "phone", "description", "logo_url", "domain"];

function emptyToNull(v) {
  if (v == null) return null;
  if (typeof v === "string" && !v.trim()) return null;
  return v;
}

function pickIrsPayload(record, batchId) {
  return {
    ein: record.ein,
    org_name: record.org_name,
    irs_subsection: record.irs_subsection,
    irs_classification: record.irs_classification,
    foundation_code: record.foundation_code,
    city: record.city,
    state: record.state,
    zip: record.zip,
    country: record.country,
    street: record.street,
    deductibility_code: record.deductibility_code,
    deductibility_status: record.deductibility_status,
    ruling_date: record.ruling_date,
    ntee_code: record.ntee_code,
    affiliation_code: record.affiliation_code,
    organization_code: record.organization_code,
    irs_status_code: record.irs_status_code,
    group_exemption_number: record.group_exemption_number,
    sort_name: record.sort_name,
    category_tags: record.category_tags || [],
    audience_tags: record.audience_tags || [],
    serves_veterans: !!record.serves_veterans,
    serves_first_responders: !!record.serves_first_responders,
    irs_source_file: record.irs_source_file,
    irs_source_date: record.irs_source_date,
    last_verified_at: record.last_verified_at,
    import_batch_id: batchId,
    data_origin: "irs_eo_bmf",
    updated_at: new Date().toISOString(),
  };
}

function directoryMirrorPayload(record, batchId, existing = null) {
  const base = {
    ein: record.ein,
    org_name: record.org_name,
    city: record.city,
    state: record.state,
    zip: record.zip,
    ntee_code: record.ntee_code,
    serves_veterans: !!record.serves_veterans,
    serves_first_responders: !!record.serves_first_responders,
    irs_subsection: record.irs_subsection,
    irs_classification: record.irs_classification,
    foundation_code: record.foundation_code,
    deductibility_code: record.deductibility_code,
    deductibility_status: record.deductibility_status,
    ruling_date: record.ruling_date,
    country: record.country,
    category_tags: record.category_tags || [],
    audience_tags: record.audience_tags || [],
    irs_source_file: record.irs_source_file,
    irs_source_date: record.irs_source_date,
    last_verified_at: record.last_verified_at,
    import_batch_id: batchId,
    data_origin: existing?.data_origin || "irs_eo_bmf",
    updated_at: new Date().toISOString(),
  };

  // Never auto-feature or mark trusted on import.
  if (!existing) {
    base.directory_status = "pending_review";
    base.is_featured = false;
    base.is_trusted = false;
  }

  // Preserve curated profile content when present.
  for (const field of CURATED_DIRECTORY_FIELDS) {
    const incoming = emptyToNull(record[field]);
    const prior = emptyToNull(existing?.[field]);
    if (prior) base[field] = prior;
    else if (incoming) base[field] = incoming;
  }

  return base;
}

async function fetchExistingByEins(supabase, eins) {
  const uniq = [...new Set(eins.filter((e) => e.length === 9))];
  const byEin = new Map();
  const CHUNK = 200;
  for (let i = 0; i < uniq.length; i += CHUNK) {
    const slice = uniq.slice(i, i + CHUNK);
    const { data, error } = await supabase.from(IRS_TABLE).select("*").in("ein", slice);
    if (error) throw error;
    for (const row of data || []) byEin.set(row.ein, row);
  }
  return byEin;
}

async function fetchDirectoryByEins(supabase, eins) {
  const uniq = [...new Set(eins.filter((e) => e.length === 9))];
  const byEin = new Map();
  const CHUNK = 200;
  for (let i = 0; i < uniq.length; i += CHUNK) {
    const slice = uniq.slice(i, i + CHUNK);
    const variants = slice.flatMap((e) => [e, `${e.slice(0, 2)}-${e.slice(2)}`]);
    const { data, error } = await supabase.from(DIRECTORY_TABLE).select("*").in("ein", variants);
    if (error) {
      // Directory table may be a non-writable view or missing columns — best-effort.
      return { byEin, directoryWritable: false, directoryError: error.message };
    }
    for (const row of data || []) {
      const k = normalizeEinDigits(row.ein);
      if (k.length === 9 && !byEin.has(k)) byEin.set(k, row);
    }
  }
  return { byEin, directoryWritable: true, directoryError: null };
}

async function buildNameLocationIndex(supabase, records) {
  const index = new Map();
  const states = [...new Set(records.map((r) => r.state).filter(Boolean))];
  for (const state of states) {
    const { data, error } = await supabase
      .from(IRS_TABLE)
      .select("ein,org_name,city,state")
      .eq("state", state)
      .limit(20000);
    if (error) continue;
    for (const row of data || []) {
      index.set(nameLocationKey(row.org_name, row.city, row.state), row.ein);
    }
  }
  return index;
}

/**
 * Plan import actions without writing (except optional batch log row).
 */
export function planImportActions(records, existingByEin, nameIndex = new Map()) {
  const actions = [];
  const seen = new Set();

  for (const record of records) {
    if (seen.has(record.ein)) {
      actions.push({ type: "skip", reason: "duplicate_in_batch", record });
      continue;
    }
    seen.add(record.ein);

    const existing = existingByEin.get(record.ein);
    if (existing) {
      actions.push({ type: "update", reason: "ein_match", record, existing });
      continue;
    }

    const locKey = nameLocationKey(record.org_name, record.city, record.state);
    const locEin = nameIndex.get(locKey);
    if (locEin && locEin !== record.ein) {
      actions.push({
        type: "skip",
        reason: "name_location_match_different_ein",
        record,
        matchedEin: locEin,
      });
      continue;
    }

    actions.push({ type: "add", reason: "new", record });
  }

  return actions;
}

function summarizeActions(actions) {
  const summary = { added: 0, updated: 0, skipped: 0, failed: 0 };
  for (const a of actions) {
    if (a.type === "add") summary.added += 1;
    else if (a.type === "update") summary.updated += 1;
    else if (a.type === "skip") summary.skipped += 1;
    else summary.failed += 1;
  }
  return summary;
}

async function writeBatchErrors(supabase, batchId, errors) {
  if (!errors?.length) return;
  const rows = errors.slice(0, 500).map((e) => ({
    batch_id: batchId,
    ein: e.ein || null,
    org_name: e.org_name || e.name || null,
    stage: e.stage || "import",
    error_message: String(e.error || e.error_message || "unknown_error"),
    row_payload: e.row_payload || e.record || null,
  }));
  await supabase.from(ERROR_TABLE).insert(rows);
}

/**
 * Run IRS EO BMF import.
 *
 * @param {object} supabase Supabase service-role client
 * @param {object} options
 * @param {'dry_run'|'apply'} options.mode
 * @param {string[]|string} [options.states]
 * @param {string} [options.subsection]
 * @param {number|null} [options.limit]
 * @param {string|null} [options.dryRunBatchId] Required for apply when enforceDryRunGate=true
 * @param {boolean} [options.enforceDryRunGate]
 * @param {{workosUserId?:string,email?:string}} [options.actor]
 * @param {typeof fetch} [options.fetchImpl]
 */
export async function runIrsNonprofitImport(supabase, options = {}) {
  const mode = options.mode === "apply" ? "apply" : "dry_run";
  const subsection = options.subsection || DEFAULT_SUBSECTION_FILTER;
  const states = options.states || ["dc"];
  const enforceDryRunGate = options.enforceDryRunGate !== false && mode === "apply";
  const classification = classificationSummary();

  if (enforceDryRunGate) {
    const dryId = options.dryRunBatchId;
    if (!dryId) {
      throw new Error("Production apply requires a successful dry-run batch id (--from-dry-run=<uuid>).");
    }
    const { data: dryBatch, error: dryErr } = await supabase
      .from(BATCH_TABLE)
      .select("*")
      .eq("id", dryId)
      .maybeSingle();
    if (dryErr) throw dryErr;
    if (!dryBatch || dryBatch.mode !== "dry_run" || dryBatch.status !== "succeeded") {
      throw new Error("Dry-run batch not found or not succeeded.");
    }
  }

  const batchInsert = {
    mode,
    status: "running",
    classification_filter: String(subsection),
    classification_label: subsectionLabel(subsection),
    states: Array.isArray(states) ? states : String(states).split(","),
    triggered_by_workos_user_id: options.actor?.workosUserId || null,
    triggered_by_email: options.actor?.email || null,
    dry_run_batch_id: options.dryRunBatchId || null,
    report: { classification },
  };

  const { data: batch, error: batchErr } = await supabase
    .from(BATCH_TABLE)
    .insert(batchInsert)
    .select("*")
    .maybeSingle();
  if (batchErr) throw batchErr;

  const batchId = batch.id;
  const loadErrors = [];

  try {
    const loaded = await loadMatchingOrganizations({
      states,
      subsection,
      limit: options.limit ?? null,
      fetchImpl: options.fetchImpl,
    });
    loadErrors.push(...(loaded.errors || []));

    const records = loaded.records || [];
    const existingByEin = await fetchExistingByEins(
      supabase,
      records.map((r) => r.ein),
    );
    const nameIndex = await buildNameLocationIndex(supabase, records);
    const actions = planImportActions(records, existingByEin, nameIndex);
    const counts = summarizeActions(actions);

    const { byEin: directoryByEin, directoryWritable, directoryError } = await fetchDirectoryByEins(
      supabase,
      records.map((r) => r.ein),
    );

    const applyErrors = [...loadErrors];

    if (mode === "apply") {
      for (const action of actions) {
        try {
          if (action.type === "skip") continue;

          const payload = pickIrsPayload(action.record, batchId);
          if (action.type === "add") {
            payload.directory_status = "pending_review";
            payload.is_featured = false;
            payload.is_trusted = false;
            payload.website = null;
            payload.phone = null;
            payload.description = null;
            const { error } = await supabase.from(IRS_TABLE).insert(payload);
            if (error) throw error;
          } else if (action.type === "update") {
            // Preserve curated profile fields on IRS table when already set.
            const existing = action.existing;
            if (emptyToNull(existing.website)) delete payload.website;
            if (emptyToNull(existing.phone)) delete payload.phone;
            if (emptyToNull(existing.description)) delete payload.description;
            // Never regress admin review status or featured/trusted flags on update.
            delete payload.directory_status;
            delete payload.is_featured;
            delete payload.is_trusted;
            const { error } = await supabase.from(IRS_TABLE).update(payload).eq("ein", action.record.ein);
            if (error) throw error;
          }

          if (directoryWritable) {
            const existingDir = directoryByEin.get(action.record.ein) || null;
            const dirPayload = directoryMirrorPayload(action.record, batchId, existingDir);
            if (existingDir) {
              // Preserve existing directory_status / featured / trusted.
              delete dirPayload.directory_status;
              delete dirPayload.is_featured;
              delete dirPayload.is_trusted;
              const { error: dErr } = await supabase
                .from(DIRECTORY_TABLE)
                .update(dirPayload)
                .eq("ein", existingDir.ein);
              if (dErr) {
                applyErrors.push({
                  stage: "directory_update",
                  ein: action.record.ein,
                  error: dErr.message,
                });
              }
            } else {
              const { error: dErr } = await supabase.from(DIRECTORY_TABLE).insert(dirPayload);
              if (dErr) {
                applyErrors.push({
                  stage: "directory_insert",
                  ein: action.record.ein,
                  error: dErr.message,
                });
              }
            }
          }
        } catch (err) {
          counts.failed += 1;
          if (action.type === "add") counts.added = Math.max(0, counts.added - 1);
          if (action.type === "update") counts.updated = Math.max(0, counts.updated - 1);
          applyErrors.push({
            stage: "upsert",
            ein: action.record?.ein,
            org_name: action.record?.org_name,
            error: String(err?.message || err),
          });
        }
      }
    }

    await writeBatchErrors(supabase, batchId, applyErrors);

    const sourceDates = (loaded.files || []).map((f) => f.sourceDate).filter(Boolean);
    const sourceDate = sourceDates.sort().slice(-1)[0] || null;

    const report = {
      classification,
      files: loaded.files,
      directoryWritable,
      directoryError,
      sampleAdds: actions.filter((a) => a.type === "add").slice(0, 10).map((a) => ({
        ein: a.record.ein,
        org_name: a.record.org_name,
        city: a.record.city,
        state: a.record.state,
      })),
      sampleUpdates: actions.filter((a) => a.type === "update").slice(0, 10).map((a) => ({
        ein: a.record.ein,
        org_name: a.record.org_name,
      })),
      sampleSkips: actions.filter((a) => a.type === "skip").slice(0, 10).map((a) => ({
        ein: a.record.ein,
        reason: a.reason,
        matchedEin: a.matchedEin || null,
      })),
    };

    const finalStatus = applyErrors.some((e) => e.stage === "download") && records.length === 0
      ? "failed"
      : "succeeded";

    const { data: updatedBatch, error: updErr } = await supabase
      .from(BATCH_TABLE)
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        source_files: (loaded.files || []).map((f) => f.sourceFile),
        source_file_date: sourceDate,
        records_found: records.length,
        records_processed: actions.length,
        records_added: counts.added,
        records_updated: counts.updated,
        records_skipped: counts.skipped,
        records_failed: counts.failed + applyErrors.filter((e) => e.stage !== "download").length,
        error_summary: applyErrors.length ? `${applyErrors.length} error(s)` : null,
        error_details: applyErrors.slice(0, 100),
        report,
      })
      .eq("id", batchId)
      .select("*")
      .maybeSingle();
    if (updErr) throw updErr;

    return {
      ok: finalStatus === "succeeded",
      mode,
      batch: updatedBatch,
      summary: {
        recordsFound: records.length,
        recordsAdded: counts.added,
        recordsUpdated: counts.updated,
        recordsSkipped: counts.skipped,
        recordsFailed: counts.failed,
        errors: applyErrors.length,
      },
      classification,
    };
  } catch (err) {
    await supabase
      .from(BATCH_TABLE)
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_summary: String(err?.message || err),
        error_details: [{ stage: "fatal", error: String(err?.message || err) }],
      })
      .eq("id", batchId);
    throw err;
  }
}
