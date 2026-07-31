#!/usr/bin/env node
/**
 * Unit tests for IRS import helpers (no network / DB required).
 * Usage: node --import ./scripts/register-at-alias.mjs scripts/test-irs-nonprofit-import.mjs
 */
import assert from "node:assert/strict";
import {
  classificationSummary,
  normalizeSubsectionCode,
  tagsForSubsection,
  formatRulingDate,
  deductibilityLabel,
} from "@/lib/irs/classification";
import { parseCsv } from "@/lib/irs/csv";
import { normalizeEoBmfRow, nameLocationKey } from "@/lib/irs/normalizeRecord";
import { filterEoBmfRows } from "@/lib/irs/eoBmfClient";
import { planImportActions } from "@/lib/irs/importService";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("5019a interprets as 501(c)(19) / subsection 19", () => {
  const c = classificationSummary();
  assert.equal(c.isValidIrsCode, false);
  assert.equal(c.interpretedAs, "501(c)(19)");
  assert.equal(c.eoBmfSubsection, "19");
});

test("normalize subsection codes", () => {
  assert.equal(normalizeSubsectionCode("19"), "19");
  assert.equal(normalizeSubsectionCode("019"), "19");
  assert.equal(normalizeSubsectionCode("03"), "03");
  assert.equal(normalizeSubsectionCode("3"), "03");
});

test("veteran tags for subsection 19", () => {
  const t = tagsForSubsection("19");
  assert.equal(t.serves_veterans, true);
  assert.ok(t.audience_tags.includes("veteran"));
  assert.ok(t.category_tags.includes("military"));
});

test("ruling date + deductibility", () => {
  assert.equal(formatRulingDate("196811"), "1968-11");
  assert.equal(deductibilityLabel("1"), "Contributions are deductible");
});

test("csv parse + filter subsection 19", () => {
  const csv = `EIN,NAME,CITY,STATE,ZIP,SUBSECTION,CLASSIFICATION,RULING,DEDUCTIBILITY,FOUNDATION,NTEE_CD
123456789,VFW POST 1,WASHINGTON,DC,20001,19,1,195001,1,00,W30
987654321,SOME CHARITY,WASHINGTON,DC,20002,03,1,196001,1,15,P20
`;
  const rows = parseCsv(csv);
  assert.equal(rows.length, 2);
  const matched = filterEoBmfRows(rows, { subsection: "19" });
  assert.equal(matched.length, 1);
  assert.equal(matched[0].NAME, "VFW POST 1");
});

test("normalize EO BMF row defaults to pending_review and not featured", () => {
  const { ok, record } = normalizeEoBmfRow({
    EIN: "12-3456789",
    NAME: "AMERICAN LEGION POST 10",
    CITY: "Arlington",
    STATE: "VA",
    ZIP: "22201",
    SUBSECTION: "19",
    CLASSIFICATION: "1",
    RULING: "194501",
    DEDUCTIBILITY: "1",
    FOUNDATION: "00",
    NTEE_CD: "W30",
  }, { sourceFile: "eo_va.csv", sourceDate: "2026-07-14" });
  assert.equal(ok, true);
  assert.equal(record.ein, "123456789");
  assert.equal(record.directory_status, "pending_review");
  assert.equal(record.is_featured, false);
  assert.equal(record.is_trusted, false);
  assert.equal(record.serves_veterans, true);
  assert.equal(record.irs_source_file, "eo_va.csv");
});

test("duplicate EIN planning", () => {
  const records = [
    { ein: "111111111", org_name: "A", city: "X", state: "DC" },
    { ein: "222222222", org_name: "B", city: "Y", state: "DC" },
    { ein: "111111111", org_name: "A DUP", city: "X", state: "DC" },
  ];
  const existing = new Map([["222222222", { ein: "222222222", org_name: "B" }]]);
  const actions = planImportActions(records, existing, new Map());
  assert.equal(actions.filter((a) => a.type === "add").length, 1);
  assert.equal(actions.filter((a) => a.type === "update").length, 1);
  assert.equal(actions.filter((a) => a.type === "skip").length, 1);
});

test("name/location key", () => {
  assert.equal(
    nameLocationKey("V.F.W. Post 1", "Washington", "dc"),
    nameLocationKey("VFW POST 1", "WASHINGTON", "DC"),
  );
});

console.log("\nAll IRS import unit tests passed.");
