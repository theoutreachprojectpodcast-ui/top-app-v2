import { parseCsv } from "@/lib/irs/csv";
import { DEFAULT_SUBSECTION_FILTER, normalizeSubsectionCode } from "@/lib/irs/classification";
import { normalizeEoBmfRow } from "@/lib/irs/normalizeRecord";

export const EO_BMF_BASE_URL = "https://www.irs.gov/pub/irs-soi";

/** State / territory EO BMF file keys (lowercase). */
export const EO_BMF_STATE_KEYS = [
  "al", "ak", "az", "ar", "ca", "co", "ct", "de", "dc", "fl", "ga", "hi", "id", "il", "in", "ia",
  "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj", "nm",
  "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa",
  "wv", "wi", "wy", "pr", "xx",
];

export function eoBmfFileUrl(stateKey) {
  const key = String(stateKey || "").trim().toLowerCase();
  return `${EO_BMF_BASE_URL}/eo_${key}.csv`;
}

export async function downloadEoBmfCsv(stateKey, { fetchImpl = fetch } = {}) {
  const url = eoBmfFileUrl(stateKey);
  const res = await fetchImpl(url, {
    headers: { Accept: "text/csv,*/*" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${res.status}`);
  }
  const text = await res.text();
  const lastModified = res.headers.get("last-modified");
  let sourceDate = null;
  if (lastModified) {
    const d = new Date(lastModified);
    if (!Number.isNaN(d.getTime())) sourceDate = d.toISOString().slice(0, 10);
  }
  return {
    stateKey: String(stateKey).toLowerCase(),
    sourceFile: `eo_${String(stateKey).toLowerCase()}.csv`,
    sourceUrl: url,
    sourceDate,
    text,
  };
}

export function filterEoBmfRows(rows, { subsection = DEFAULT_SUBSECTION_FILTER } = {}) {
  const wanted = new Set(
    (Array.isArray(subsection) ? subsection : String(subsection).split(","))
      .map((s) => normalizeSubsectionCode(s))
      .filter(Boolean),
  );
  return (rows || []).filter((row) => wanted.has(normalizeSubsectionCode(row.SUBSECTION)));
}

export async function loadMatchingOrganizations({
  states = ["dc"],
  subsection = DEFAULT_SUBSECTION_FILTER,
  fetchImpl = fetch,
  limit = null,
} = {}) {
  const stateList = (Array.isArray(states) ? states : String(states).split(","))
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);

  const files = [];
  const matched = [];
  const errors = [];

  for (const stateKey of stateList) {
    try {
      const file = await downloadEoBmfCsv(stateKey, { fetchImpl });
      const rows = parseCsv(file.text);
      const filtered = filterEoBmfRows(rows, { subsection });
      files.push({
        stateKey,
        sourceFile: file.sourceFile,
        sourceUrl: file.sourceUrl,
        sourceDate: file.sourceDate,
        totalRows: rows.length,
        matchedRows: filtered.length,
      });
      for (const row of filtered) {
        const normalized = normalizeEoBmfRow(row, {
          sourceFile: file.sourceFile,
          sourceDate: file.sourceDate,
        });
        if (!normalized.ok) {
          errors.push({ stage: "normalize", error: normalized.error, ein: row?.EIN, name: row?.NAME });
          continue;
        }
        matched.push(normalized.record);
        if (limit != null && matched.length >= limit) {
          return { files, records: matched.slice(0, limit), errors };
        }
      }
    } catch (err) {
      errors.push({ stage: "download", stateKey, error: String(err?.message || err) });
    }
  }

  return { files, records: matched, errors };
}
