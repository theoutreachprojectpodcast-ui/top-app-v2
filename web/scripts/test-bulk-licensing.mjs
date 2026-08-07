/**
 * Bulk licensing unit tests (no network / no DB).
 * Usage: node --import ./scripts/register-at-alias.mjs scripts/test-bulk-licensing.mjs
 */
import assert from "node:assert/strict";
import {
  normalizeBusinessCode,
  validateBusinessCode,
  RESERVED_BUSINESS_CODES,
} from "../src/lib/bulkLicensing/businessCode.js";
import {
  formatSeatNumber,
  generateLicenseBatch,
  hashLicenseToken,
  maskDisplayCode,
  buildLicenseCodes,
} from "../src/lib/bulkLicensing/licenseCodes.js";
import { isValidBulkPackageSize, normalizeBulkPackageSize, BULK_PRICE_ENV_KEYS, bulkPriceEnvKeyForPackageSize } from "../src/lib/bulkLicensing/packages.js";
import { canManageBilling, canManageLicenses, roleAtLeast } from "../src/lib/bulkLicensing/authorization.js";
import { evaluateBulkRedemptionEligibility } from "../src/lib/bulkLicensing/membershipRules.js";
import { parseEmailCsv, sanitizeCsvCell, buildCsv } from "../src/lib/bulkLicensing/csv.js";
import { requirePro } from "../src/lib/membership/membershipAccess.js";
import { isBulkCheckoutMetadata } from "../src/lib/bulkLicensing/bulkCheckoutMetadata.js";

const failures = [];
function check(cond, msg) {
  try {
    assert.ok(cond, msg);
  } catch (e) {
    failures.push(e.message || msg);
  }
}

// Architecture markers — bulk checkout metadata (never conflate with WorkOS org / sponsor promos)
check(isBulkCheckoutMetadata({ checkout_kind: "bulk_licensing" }), "bulk checkout_kind");
check(isBulkCheckoutMetadata({ bulk_organization_id: "org_1" }), "bulk org metadata");
check(isBulkCheckoutMetadata({ bulk_purchase_id: "p_1" }), "bulk purchase metadata");
check(!isBulkCheckoutMetadata({ checkout_kind: "podcast_sponsor" }), "sponsor checkout not bulk");
check(!isBulkCheckoutMetadata({ workos_organization_id: "org_x" }), "WorkOS org id is not bulk");
check(!isBulkCheckoutMetadata({}), "empty metadata not bulk");
check(!isBulkCheckoutMetadata(null), "null metadata not bulk");
check(RESERVED_BUSINESS_CODES.has("WORKOS") && RESERVED_BUSINESS_CODES.has("SPONSOR"), "WORKOS/SPONSOR reserved business codes");

// Packages
check(isValidBulkPackageSize(25) && isValidBulkPackageSize(200), "valid package sizes");
check(!isValidBulkPackageSize(30), "invalid package size rejected");
check(normalizeBulkPackageSize("100") === 100, "normalize package size");
check(bulkPriceEnvKeyForPackageSize(25) === "STRIPE_BULK_25_PRICE_ID", "25 env key");
check(bulkPriceEnvKeyForPackageSize(50) === "STRIPE_BULK_50_PRICE_ID", "50 env key");
check(bulkPriceEnvKeyForPackageSize(100) === "STRIPE_BULK_100_PRICE_ID", "100 env key");
check(bulkPriceEnvKeyForPackageSize(200) === "STRIPE_BULK_200_PRICE_ID", "200 env key");
check(Object.keys(BULK_PRICE_ENV_KEYS).length === 4, "four package env keys");

// Business codes
check(normalizeBusinessCode(" acme_pa ") === "ACME-PA", "normalize business code");
check(validateBusinessCode("ACME").ok, "ACME valid");
check(validateBusinessCode("MARS-PA").ok, "MARS-PA valid");
check(!validateBusinessCode("A").ok, "too short rejected");
check(!validateBusinessCode("ADMIN").ok, "reserved rejected");
check(RESERVED_BUSINESS_CODES.has("OUTREACH"), "OUTREACH reserved");

// License codes
check(formatSeatNumber(1, 100) === "001", "seat pad 3");
check(formatSeatNumber(12, 200) === "012", "seat pad");
const batch25 = generateLicenseBatch({ businessCode: "ACME", packageSize: 25 });
const batch100 = generateLicenseBatch({ businessCode: "ACME", packageSize: 100 });
check(batch25.length === 25, "exactly 25 licenses");
check(batch100.length === 100, "exactly 100 licenses");
check(batch100[0].seatNumber === 1 && batch100[99].seatNumber === 100, "seat numbers contiguous");
const codes = new Set(batch100.map((r) => r.displayCode));
check(codes.size === 100, "no duplicate display codes");
check(batch100.every((r) => r.secureTokenHash === hashLicenseToken(r.redeemToken)), "hash matches token");
check(batch100[0].displayCode.startsWith("ACME-001-"), "display format prefix");
check(maskDisplayCode("ACME-001-K7Q9M2").includes("•"), "mask hides suffix");
const a = buildLicenseCodes("ACME", 1, 25, "AAAAAA");
const b = buildLicenseCodes("ACME", 1, 25, "AAAAAA");
check(a.displayCode === b.displayCode, "deterministic with fixed suffix");

// Auth helpers
check(canManageBilling("owner") && canManageBilling("billing_admin"), "billing roles");
check(!canManageBilling("viewer"), "viewer cannot billing");
check(canManageLicenses("license_admin"), "license admin");
check(roleAtLeast("owner", "viewer"), "role rank");

// Membership rules
check(evaluateBulkRedemptionEligibility(null).ok, "no profile ok");
check(
  !evaluateBulkRedemptionEligibility({
    membership_source: "bulk_org",
    bulk_license_id: "x",
    bulk_organization_id: "org1",
  }, "org2").ok,
  "second org blocked",
);
const withPersonal = evaluateBulkRedemptionEligibility({
  membership_source: "stripe",
  stripe_subscription_id: "sub_1",
  billing_status: "active",
});
check(withPersonal.ok && withPersonal.warnings.length === 1, "personal sub warning");

// CSV
check(sanitizeCsvCell("=1+1").startsWith("'"), "formula injection guarded");
check(parseEmailCsv("email\na@b.com\na@b.com\nbad").emails.length === 1, "csv parse emails");
check(buildCsv(["a"], [["=cmd"]]).includes("'=cmd"), "csv build sanitizes");

// requirePro bulk_org
const future = new Date(Date.now() + 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();
check(
  requirePro({
    membership_tier: "member",
    membership_status: "active",
    membership_source: "bulk_org",
    renewal_date: future,
  }),
  "bulk_org active requirePro",
);
check(
  !requirePro({
    membership_tier: "member",
    membership_status: "active",
    membership_source: "bulk_org",
    renewal_date: past,
  }),
  "bulk_org expired requirePro false",
);

if (failures.length) {
  console.error("[test:bulk-licensing] FAILURES:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("[test:bulk-licensing] All bulk licensing unit tests passed.");
