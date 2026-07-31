import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import {
  deductibilityLabel,
  formatRulingDate,
  normalizeSubsectionCode,
  tagsForSubsection,
} from "@/lib/irs/classification";

function cleanText(value) {
  const s = String(value ?? "").trim();
  return s || null;
}

function normalizeName(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeZip(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 9) return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
  if (digits.length >= 5) return digits.slice(0, 5);
  return raw;
}

/**
 * Map one EO BMF CSV row into our nonprofit directory shape.
 */
export function normalizeEoBmfRow(row, meta = {}) {
  const ein = normalizeEinDigits(row?.EIN || row?.ein);
  if (ein.length !== 9) {
    return { ok: false, error: "invalid_ein", row };
  }

  const subsection = normalizeSubsectionCode(row?.SUBSECTION ?? row?.subsection);
  const tags = tagsForSubsection(subsection);
  const state = cleanText(row?.STATE || row?.state)?.toUpperCase() || null;
  const isIntl = !state || state === "AA" || state === "AE" || state === "AP" || String(meta.sourceFile || "").includes("eo_xx");

  const record = {
    ein,
    org_name: cleanText(row?.NAME || row?.org_name) || `Organization ${ein}`,
    irs_subsection: subsection || null,
    irs_classification: cleanText(row?.CLASSIFICATION || row?.classification),
    foundation_code: cleanText(row?.FOUNDATION || row?.foundation_code),
    city: cleanText(row?.CITY || row?.city),
    state,
    zip: normalizeZip(row?.ZIP || row?.zip),
    country: isIntl && !state ? "INTL" : "US",
    street: cleanText(row?.STREET || row?.street),
    deductibility_code: cleanText(row?.DEDUCTIBILITY || row?.deductibility_code),
    deductibility_status: deductibilityLabel(row?.DEDUCTIBILITY || row?.deductibility_code),
    ruling_date: formatRulingDate(row?.RULING || row?.ruling_date),
    ntee_code: cleanText(row?.NTEE_CD || row?.ntee_code),
    affiliation_code: cleanText(row?.AFFILIATION),
    organization_code: cleanText(row?.ORGANIZATION),
    irs_status_code: cleanText(row?.STATUS),
    group_exemption_number: cleanText(row?.GROUP),
    sort_name: cleanText(row?.SORT_NAME),
    website: null,
    phone: null,
    description: null,
    category_tags: tags.category_tags,
    audience_tags: tags.audience_tags,
    serves_veterans: tags.serves_veterans,
    serves_first_responders: tags.serves_first_responders,
    directory_status: "pending_review",
    is_featured: false,
    is_trusted: false,
    irs_source_file: meta.sourceFile || null,
    irs_source_date: meta.sourceDate || null,
    last_verified_at: new Date().toISOString(),
    data_origin: "irs_eo_bmf",
    _name_key: normalizeName(row?.NAME || row?.org_name),
  };

  return { ok: true, record };
}

export function nameLocationKey(orgName, city, state) {
  return `${normalizeName(orgName)}|${String(state || "").toUpperCase()}|${normalizeName(city)}`;
}
