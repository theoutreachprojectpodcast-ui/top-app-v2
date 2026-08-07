/**
 * Secure per-seat license code generation.
 * Display: ACME-001-K7Q9M2 — redeem via full token hashed at rest.
 */
import { createHash, randomBytes } from "node:crypto";

const SUFFIX_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * @param {number} seatNumber
 * @param {number} packageSize
 * @returns {string}
 */
export function formatSeatNumber(seatNumber, packageSize) {
  const width = Math.max(3, String(packageSize).length);
  return String(seatNumber).padStart(width, "0");
}

/**
 * Cryptographically secure random suffix (no Math.random).
 * @param {number} [length=6]
 * @returns {string}
 */
export function generateSecureSuffix(length = 6) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += SUFFIX_ALPHABET[bytes[i] % SUFFIX_ALPHABET.length];
  }
  return out;
}

/**
 * @param {string} businessCode
 * @param {number} seatNumber
 * @param {number} packageSize
 * @param {string} [suffix]
 * @returns {{ displayCode: string, redeemToken: string, seatLabel: string, suffix: string }}
 */
export function buildLicenseCodes(businessCode, seatNumber, packageSize, suffix) {
  const code = String(businessCode || "").trim().toUpperCase();
  const seatLabel = formatSeatNumber(seatNumber, packageSize);
  const secureSuffix = suffix || generateSecureSuffix(6);
  const displayCode = `${code}-${seatLabel}-${secureSuffix}`;
  return {
    displayCode,
    redeemToken: displayCode,
    seatLabel,
    suffix: secureSuffix,
  };
}

/**
 * @param {string} token
 * @returns {string}
 */
export function hashLicenseToken(token) {
  return createHash("sha256").update(String(token || "").trim().toUpperCase(), "utf8").digest("hex");
}

/**
 * Mask for UI lists: ACME-001-••••••
 * @param {string} displayCode
 * @returns {string}
 */
export function maskDisplayCode(displayCode) {
  const parts = String(displayCode || "").split("-");
  if (parts.length < 3) return "••••••••";
  const suffix = parts[parts.length - 1] || "";
  const seat = parts[parts.length - 2] || "";
  const prefix = parts.slice(0, -2).join("-");
  return `${prefix}-${seat}-${"•".repeat(Math.max(4, suffix.length))}`;
}

/**
 * Generate exactly `packageSize` unique licenses for a batch.
 * @param {{ businessCode: string, packageSize: number }} opts
 * @returns {Array<{ seatNumber: number, displayCode: string, redeemToken: string, secureTokenHash: string }>}
 */
export function generateLicenseBatch(opts) {
  const packageSize = Number(opts.packageSize);
  const businessCode = String(opts.businessCode || "").trim().toUpperCase();
  if (!Number.isInteger(packageSize) || packageSize < 1) {
    throw new Error("invalid_package_size");
  }
  if (!businessCode) throw new Error("missing_business_code");

  const seen = new Set();
  /** @type {Array<{ seatNumber: number, displayCode: string, redeemToken: string, secureTokenHash: string }>} */
  const rows = [];
  for (let seat = 1; seat <= packageSize; seat += 1) {
    let attempt = 0;
    let built;
    do {
      built = buildLicenseCodes(businessCode, seat, packageSize);
      attempt += 1;
      if (attempt > 20) throw new Error("license_suffix_collision");
    } while (seen.has(built.displayCode));
    seen.add(built.displayCode);
    rows.push({
      seatNumber: seat,
      displayCode: built.displayCode,
      redeemToken: built.redeemToken,
      secureTokenHash: hashLicenseToken(built.redeemToken),
    });
  }
  if (rows.length !== packageSize) {
    throw new Error("license_count_mismatch");
  }
  return rows;
}
