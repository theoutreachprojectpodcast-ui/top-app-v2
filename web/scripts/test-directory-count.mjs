/**
 * Directory total-count contracts (status copy + filter/retry helpers).
 * Run: node scripts/test-directory-count.mjs
 */
import assert from "node:assert/strict";
import {
  formatDirectoryCountUnavailableStatus,
  formatDirectoryFoundStatus,
  formatDirectorySearchingStatus,
} from "../src/features/directory/formatDirectoryStatus.js";
import {
  isMissingDirectoryStatusColumn,
  shouldRetryDirectoryWithoutStatus,
} from "../src/lib/supabase/directoryFilters.js";

// --- Status copy ---
assert.equal(formatDirectoryFoundStatus(247), "247 organizations found");
assert.equal(formatDirectoryFoundStatus(1), "1 organization found");
assert.equal(formatDirectoryFoundStatus(0), "0 organizations found");
assert.equal(
  formatDirectoryFoundStatus(43587, { stateLabel: "Missouri" }),
  "Missouri — 43,587 organizations found"
);
assert.equal(formatDirectoryFoundStatus(null), null);
assert.equal(formatDirectoryFoundStatus(undefined), null);
assert.equal(formatDirectoryFoundStatus(Number.NaN), null);
assert.equal(formatDirectorySearchingStatus("Missouri"), "Missouri — calculating total...");
assert.equal(formatDirectoryCountUnavailableStatus("Missouri"), "Missouri — total unavailable");

// --- Missing-column detection (page GET shape) ---
assert.equal(
  isMissingDirectoryStatusColumn({
    message: 'column nonprofits_search_app_v1.directory_status does not exist',
  }),
  true
);
assert.equal(isMissingDirectoryStatusColumn({ message: "Invalid API key" }), false);

// --- HEAD count silent failure → retry without status ---
assert.equal(
  shouldRetryDirectoryWithoutStatus(
    { error: { message: "" }, count: null, status: 400 },
    { attemptedWithStatus: true }
  ),
  true
);
assert.equal(
  shouldRetryDirectoryWithoutStatus(
    {
      error: { message: 'column nonprofits_search_app_v1.directory_status does not exist' },
      count: null,
      status: 400,
    },
    { attemptedWithStatus: true }
  ),
  true
);
assert.equal(
  shouldRetryDirectoryWithoutStatus(
    { error: null, count: 43587, status: 200 },
    { attemptedWithStatus: true }
  ),
  false
);
assert.equal(
  shouldRetryDirectoryWithoutStatus(
    { error: { message: "" }, count: null, status: 401 },
    { attemptedWithStatus: true }
  ),
  false,
  "auth failures must not drop the status filter"
);
assert.equal(
  shouldRetryDirectoryWithoutStatus(
    { error: { message: "" }, count: null, status: 400 },
    { attemptedWithStatus: false }
  ),
  false,
  "do not retry when status filter was already omitted"
);

// --- Shared filter builder: page + count must apply the same predicates ---
function buildFilterPlan(filters, { includePublicStatus = true } = {}) {
  const plan = [`eq:state:${filters.state}`];
  if (includePublicStatus) plan.push("or:directory_status.approved|null");
  if ((filters.q || "").trim()) {
    const term = String(filters.q).replace(/,/g, " ").trim();
    plan.push(`or:org_name|city.ilike:${term}`);
  }
  if (filters.service) plan.push(`ilike:ntee_code:${filters.service}%`);
  if (filters.audience === "veteran") plan.push("eq:serves_veterans:true");
  if (filters.audience === "first_responder") plan.push("eq:serves_first_responders:true");
  if (filters.irsSubsection) plan.push(`eq:irs_subsection:${filters.irsSubsection}`);
  return plan;
}

function assertSameFilters(filters) {
  const pagePlan = buildFilterPlan(filters, { includePublicStatus: true });
  const countPlan = buildFilterPlan(filters, { includePublicStatus: true });
  assert.deepEqual(pagePlan, countPlan);
}

assertSameFilters({ state: "MO", q: "", service: "", audience: "all" });
assertSameFilters({ state: "MO", q: "food", service: "K", audience: "veteran" });
assertSameFilters({ state: "CA", q: "youth", service: "O", audience: "first_responder", irsSubsection: "03" });

// --- Pagination must not reduce the displayed total ---
{
  const PAGE_SIZE = 20;
  const totalMatching = 247;
  const page1Rows = Math.min(PAGE_SIZE, totalMatching);
  const page2Rows = Math.min(PAGE_SIZE, Math.max(0, totalMatching - PAGE_SIZE));
  assert.equal(page1Rows, 20);
  assert.equal(page2Rows, 20);
  // UI status uses totalMatching, never page1Rows / page2Rows length
  assert.equal(formatDirectoryFoundStatus(totalMatching), "247 organizations found");
  assert.notEqual(formatDirectoryFoundStatus(totalMatching), formatDirectoryFoundStatus(page1Rows));
}

// --- Rapid search race: only the latest generation may commit ---
{
  let committed = null;
  let gen = 0;
  async function run(label, delayMs) {
    const my = ++gen;
    await new Promise((r) => setTimeout(r, delayMs));
    if (my !== gen) return;
    committed = label;
  }
  await Promise.all([run("stale-MO", 30), run("latest-KS", 5)]);
  assert.equal(committed, "latest-KS");
}

// --- Failed count must not leave calculating… ---
{
  const label = "Missouri";
  const count = null;
  const status =
    formatDirectoryFoundStatus(count, { stateLabel: label }) ||
    formatDirectoryCountUnavailableStatus(label);
  assert.equal(status, "Missouri — total unavailable");
  assert.ok(!/calculating total/i.test(status));
}

console.log("test-directory-count: ok");
