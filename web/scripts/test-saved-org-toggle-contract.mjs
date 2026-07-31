/**
 * Unit tests for saved-organization existence + list helpers (no network).
 * Run: node --import ./scripts/register-at-alias.mjs scripts/test-saved-org-toggle-contract.mjs
 */
import assert from "node:assert/strict";
import { normalizeEinDigits } from "../src/features/nonprofits/lib/einUtils.js";

function orderSavedEins(eins) {
  return [...new Set((eins || []).map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))];
}

function collapseToggles(batch) {
  const byEin = new Map();
  for (const item of batch) byEin.set(item.ein, item);
  return [...byEin.values()];
}

// Normalize
assert.equal(normalizeEinDigits("12-3456789"), "123456789");
assert.equal(orderSavedEins(["12-3456789", "123456789", "bad"]).join(","), "123456789");

// Toggle collapse: last action wins per EIN
const collapsed = collapseToggles([
  { ein: "123456789", action: "save", epoch: 1 },
  { ein: "123456789", action: "unsave", epoch: 2 },
  { ein: "987654321", action: "save", epoch: 2 },
]);
assert.equal(collapsed.find((x) => x.ein === "123456789").action, "unsave");
assert.equal(collapsed.find((x) => x.ein === "987654321").action, "save");

// Diff save/unsave sets
const previous = new Set(["111111111", "222222222"]);
const next = new Set(["222222222", "333333333"]);
const added = [...next].filter((e) => !previous.has(e));
const removed = [...previous].filter((e) => !next.has(e));
assert.deepEqual(added, ["333333333"]);
assert.deepEqual(removed, ["111111111"]);

console.log("test-saved-org-toggle-contract: ok");
