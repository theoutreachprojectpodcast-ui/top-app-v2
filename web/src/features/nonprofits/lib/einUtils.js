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

export function isValidEinDigits(digits) {
  return normalizeEinDigits(digits).length === 9;
}
