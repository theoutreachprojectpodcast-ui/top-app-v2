/**
 * Bulk license package sizes and Stripe price env resolution.
 * Never hardcode Stripe price IDs in UI components.
 */
import { BULK_PACKAGE_SIZES } from "@/lib/bulkLicensing/packageSizes";

export { BULK_PACKAGE_SIZES };

/** @type {Record<number, string>} */
export const BULK_PRICE_ENV_KEYS = Object.freeze({
  25: "STRIPE_BULK_25_PRICE_ID",
  50: "STRIPE_BULK_50_PRICE_ID",
  100: "STRIPE_BULK_100_PRICE_ID",
  200: "STRIPE_BULK_200_PRICE_ID",
});

/**
 * @param {unknown} size
 * @returns {size is 25 | 50 | 100 | 200}
 */
export function isValidBulkPackageSize(size) {
  const n = Number(size);
  return BULK_PACKAGE_SIZES.includes(n);
}

/**
 * @param {unknown} size
 * @returns {25 | 50 | 100 | 200 | null}
 */
export function normalizeBulkPackageSize(size) {
  const n = Number(size);
  if (!BULK_PACKAGE_SIZES.includes(n)) return null;
  return /** @type {25 | 50 | 100 | 200} */ (n);
}

/**
 * @param {unknown} size
 * @returns {string}
 */
export function bulkPriceEnvKeyForPackageSize(size) {
  const n = normalizeBulkPackageSize(size);
  return n ? BULK_PRICE_ENV_KEYS[n] : "";
}

/**
 * @param {unknown} size
 * @returns {string}
 */
export function bulkPriceIdForPackageSize(size) {
  const key = bulkPriceEnvKeyForPackageSize(size);
  if (!key) return "";
  return process.env[key]?.trim() || "";
}

/** @returns {string[]} */
export function bulkMissingPriceEnvKeys() {
  return BULK_PACKAGE_SIZES.map((n) => BULK_PRICE_ENV_KEYS[n]).filter(
    (key) => !process.env[key]?.trim(),
  );
}

export function bulkCheckoutConfigured() {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) return false;
  return bulkMissingPriceEnvKeys().length === 0;
}
