/** Normalize EIN to 9 digits for URLs and enrichment PK alignment. */
export function normalizeEinDigits(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 9);
  // Some directory sources store EIN as numeric and drop leading zeroes.
  if (digits.length > 0 && digits.length < 9) return digits.padStart(9, "0");
  return digits;
}

/** IRS-style dashed EIN when we have 9 digits. */
export function formatEinDashed(digits) {
  const d = normalizeEinDigits(digits);
  if (d.length !== 9) return "";
  return `${d.slice(0, 2)}-${d.slice(2)}`;
}

/**
 * All EIN string forms we may need to match in Postgres / PostgREST filters.
 * Directory / legacy tables sometimes store unpadded digits (`10303581`) or dashed
 * (`01-0303581`) while the app always prefers the canonical 9-digit form.
 */
export function einLookupVariants(value) {
  const e = normalizeEinDigits(value);
  if (e.length !== 9) return [];
  const unpadded = e.replace(/^0+/, "") || "0";
  return [...new Set([e, unpadded, formatEinDashed(e)])];
}

/** Expand many normalized EINs into a deduped lookup list for `.in("ein", …)`. */
export function expandEinLookupList(values = []) {
  return [...new Set((values || []).flatMap((v) => einLookupVariants(v)))];
}

export function isValidEinDigits(digits) {
  return normalizeEinDigits(digits).length === 9;
}
