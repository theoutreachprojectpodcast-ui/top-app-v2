/**
 * Unit tests for saved-organization name resolution.
 * Run: node scripts/test-saved-organization-resolution.mjs
 */
import assert from "node:assert/strict";
import {
  buildSavedOrgFallbackRow,
  nonprofitExistsForSave,
  overlayNonprofitProfileOnDirectoryRow,
  resolveSavedOrganizationDirectoryRows,
} from "../src/lib/savedOrganizations/resolveSavedOrganizations.js";
import { ORGANIZATION_UNAVAILABLE_LABEL } from "../src/lib/savedOrganizations/savedOrganizationLabels.js";
import { mapNonprofitCardRow } from "../src/features/nonprofits/mappers/nonprofitCardMapper.js";

function mockSupabase({ directory = [], enrichment = [], profiles = [], legacy = [], trusted = [] } = {}) {
  return {
    from(table) {
      const rows =
        table === "nonprofit_profiles"
          ? profiles
          : table === "nonprofit_directory_enrichment"
            ? enrichment
            : table === "nonprofits_search_app_v1"
              ? directory
              : table === "nonprofits"
                ? legacy
                : table === "trusted_resources"
                  ? trusted
                  : [];
      const state = { filters: [] };
      const api = {
        select() {
          return api;
        },
        in(col, values) {
          state.filters.push({ col, values: new Set(values.map(String)) });
          return api;
        },
        eq(col, value) {
          state.filters.push({ col, values: new Set([String(value)]) });
          return api;
        },
        limit() {
          return api;
        },
        maybeSingle: async () => {
          const data = filterRows(rows, state.filters)[0] || null;
          return { data, error: null };
        },
        then(resolve) {
          return Promise.resolve({ data: filterRows(rows, state.filters), error: null }).then(resolve);
        },
      };
      return api;
    },
  };
}

function filterRows(rows, filters) {
  if (!filters.length) return rows;
  return rows.filter((row) =>
    filters.every((f) => {
      const v = String(row[f.col] ?? "");
      return f.values.has(v);
    }),
  );
}

// --- overlay applies display_name_override ---
{
  const merged = overlayNonprofitProfileOnDirectoryRow(
    { ein: "530196605", org_name: "IRS NAME" },
    { display_name_override: "American Red Cross", website: "https://redcross.org" },
  );
  assert.equal(merged.org_name, "American Red Cross");
  assert.equal(merged.website, "https://redcross.org");
}

// --- enrichment-only fallback builds a named row ---
{
  const row = buildSavedOrgFallbackRow(
    "530196605",
    { canonical_display_name: "American Red Cross", irs_name: "AMERICAN NATIONAL RED CROSS" },
    null,
  );
  assert.equal(row.org_name, "American Red Cross");
  assert.equal(row.ein, "530196605");
}

// --- resolve: directory hit ---
{
  const sb = mockSupabase({
    directory: [{ ein: "530196605", org_name: "American Red Cross", city: "Washington", state: "DC" }],
  });
  const rows = await resolveSavedOrganizationDirectoryRows(sb, ["53-0196605"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].savedResolutionStatus, "resolved");
  assert.match(String(rows[0].orgName), /Red Cross/i);
  assert.equal(rows[0].nonprofitId, "530196605");
}

// --- resolve: enrichment-only when directory missing (legacy gap) ---
{
  const sb = mockSupabase({
    directory: [],
    enrichment: [
      {
        ein: "530196605",
        canonical_display_name: "American Red Cross",
        ein_identity_verified: false,
      },
    ],
  });
  const rows = await resolveSavedOrganizationDirectoryRows(sb, ["530196605"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].savedResolutionStatus, "resolved");
  assert.match(String(rows[0].orgName), /Red Cross/i);
}

// --- resolve: legacy nonprofits table when search view misses ---
{
  const sb = mockSupabase({
    directory: [],
    legacy: [{ ein: "987654321", name: "Legacy Food Bank", city: "Austin", state: "TX" }],
  });
  const rows = await resolveSavedOrganizationDirectoryRows(sb, ["987654321"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].savedResolutionStatus, "resolved");
  assert.match(String(rows[0].orgName), /Food Bank/i);
}

// --- resolve: trusted catalog when only curated listing has the EIN ---
{
  const sb = mockSupabase({
    directory: [],
    trusted: [{ ein: "112233445", display_name: "Shepherds Light Foundation", slug: "shepherds-light" }],
  });
  const rows = await resolveSavedOrganizationDirectoryRows(sb, ["112233445"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].savedResolutionStatus, "resolved");
  assert.match(String(rows[0].orgName), /Shepherds/i);
}

// --- exists: legacy nonprofits count as saveable ---
{
  const sb = mockSupabase({
    directory: [],
    legacy: [{ ein: "555666777", name: "Only In Legacy Table" }],
  });
  assert.equal(await nonprofitExistsForSave(sb, "555666777"), true);
  assert.equal(await nonprofitExistsForSave(sb, "000000000"), false);
}


// --- resolve: profile override when directory missing ---
{
  const sb = mockSupabase({
    directory: [],
    profiles: [{ ein: "123456789", display_name_override: "Habitat for Humanity" }],
  });
  const rows = await resolveSavedOrganizationDirectoryRows(sb, ["123456789"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].savedResolutionStatus, "resolved");
  assert.match(String(rows[0].orgName), /Habitat/i);
}

// --- resolve: unavailable stub (no silent drop) ---
{
  const sb = mockSupabase({ directory: [], enrichment: [], profiles: [] });
  const rows = await resolveSavedOrganizationDirectoryRows(sb, ["999999999"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].savedResolutionStatus, "unavailable");
  assert.equal(String(rows[0].orgName || "").trim(), "");
  const card = mapNonprofitCardRow(rows[0], "saved");
  assert.equal(card.name, ORGANIZATION_UNAVAILABLE_LABEL);
}

// --- resolve: unverified directory row still surfaces name for saved list ---
{
  const sb = mockSupabase({
    directory: [{ ein: "111111111", org_name: "Local Food Bank", ein_identity_verified: false }],
    enrichment: [{ ein: "111111111", ein_identity_verified: false, irs_name: "LOCAL FOOD BANK INC" }],
  });
  const rows = await resolveSavedOrganizationDirectoryRows(sb, ["111111111"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].savedResolutionStatus, "resolved");
  assert.ok(String(rows[0].orgName).length > 0);
}

// --- mapper no longer uses "Saved organization" for saved source ---
{
  const card = mapNonprofitCardRow({ ein: "000000000", orgName: "" }, "saved");
  assert.equal(card.name, ORGANIZATION_UNAVAILABLE_LABEL);
  assert.notEqual(card.name.toLowerCase(), "saved organization");
}

console.log("test-saved-organization-resolution: ok");
