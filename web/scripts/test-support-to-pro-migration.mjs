/**
 * Unit tests for Support→Pro migration date logic + entitlement helper.
 * Usage: node scripts/test-support-to-pro-migration.mjs
 */
import assert from "node:assert/strict";
import {
  resolveOriginalSupportPeriod,
  addOneCalendarYear,
  isPeriodStillActive,
  hasMigratedSupportProEntitlement,
  migrationEmailIdempotencyKey,
  formatMigrationExpirationDate,
  SUPPORT_TO_PRO_MIGRATION_VERSION,
  SUPPORT_TO_PRO_MEMBERSHIP_SOURCE,
} from "../src/lib/membership/supportToProMigrationShared.js";

const start = new Date("2026-02-14T15:30:00.000Z");
const endYear = addOneCalendarYear(start);
assert.equal(endYear.toISOString(), "2027-02-14T15:30:00.000Z");

const period = resolveOriginalSupportPeriod({
  stripePeriodStart: Math.floor(start.getTime() / 1000),
  stripePeriodEnd: Math.floor(endYear.getTime() / 1000),
  accountCreatedAt: "2025-01-01T00:00:00.000Z",
});
assert.equal(period.startSource, "stripe_current_period_start");
assert.equal(period.endSource, "stripe_current_period_end");
assert.equal(period.end.toISOString(), endYear.toISOString());

const fallback = resolveOriginalSupportPeriod({
  accountCreatedAt: "2026-03-01T12:00:00.000Z",
});
assert.equal(fallback.startSource, "account_created");
assert.equal(fallback.endSource, "one_calendar_year");
assert.equal(fallback.end.toISOString(), "2027-03-01T12:00:00.000Z");

const missing = resolveOriginalSupportPeriod({});
assert.equal(missing.start, null);
assert.equal(missing.end, null);

assert.equal(isPeriodStillActive(endYear, new Date("2026-06-01T00:00:00.000Z")), true);
assert.equal(isPeriodStillActive(endYear, new Date("2027-02-15T00:00:00.000Z")), false);

const migratedProfile = {
  membership_tier: "member",
  membership_source: SUPPORT_TO_PRO_MEMBERSHIP_SOURCE,
  migrated_to_pro_until: "2027-02-14T15:30:00.000Z",
};
assert.equal(
  hasMigratedSupportProEntitlement(migratedProfile, new Date("2026-06-01T00:00:00.000Z")),
  true,
);
assert.equal(
  hasMigratedSupportProEntitlement(migratedProfile, new Date("2027-02-15T00:00:00.000Z")),
  false,
);

const supportOnly = {
  membership_tier: "support",
  membership_source: "stripe",
  membership_status: "active",
};
assert.equal(hasMigratedSupportProEntitlement(supportOnly), false);

const key = migrationEmailIdempotencyKey(SUPPORT_TO_PRO_MIGRATION_VERSION, "user_123");
assert.equal(key, `support-pro-migration-email:${SUPPORT_TO_PRO_MIGRATION_VERSION}:user_123`);
assert.equal(key, migrationEmailIdempotencyKey(SUPPORT_TO_PRO_MIGRATION_VERSION, "user_123"));

assert.match(formatMigrationExpirationDate("2027-02-14T15:30:00.000Z"), /February/);

// Migration must not extend from "now"
const migrationNow = new Date("2026-07-16T00:00:00.000Z");
const originalEnd = resolveOriginalSupportPeriod({
  stripePeriodStart: Math.floor(new Date("2026-01-10T00:00:00.000Z").getTime() / 1000),
  stripePeriodEnd: Math.floor(new Date("2027-01-10T00:00:00.000Z").getTime() / 1000),
}).end;
assert.ok(originalEnd.getTime() < addOneCalendarYear(migrationNow).getTime());
assert.equal(originalEnd.toISOString(), "2027-01-10T00:00:00.000Z");

console.log("[test:support-to-pro-migration] All migration helper tests passed.");
