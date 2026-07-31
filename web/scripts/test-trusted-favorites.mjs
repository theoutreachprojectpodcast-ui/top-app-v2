/**
 * Trusted resource favorite key helpers + view-model EIN exposure.
 * Usage: node --import ./scripts/register-at-alias.mjs scripts/test-trusted-favorites.mjs
 */
import assert from "node:assert/strict";
import {
  isTrustedResourceFavorited,
  resolveTrustedFavoriteKeys,
  toggleTrustedResourceFavorite,
} from "../src/features/trusted-resources/domain/trustedFavoriteKeys.js";
import { buildTrustedResourceViewModel } from "../src/features/trusted-resources/domain/trustedResourceViewModel.js";

const withEin = {
  trustedResourceSlug: "example-org",
  directoryNonprofitId: "12-3456789",
  ein: "123456789",
  name: "Example",
};
const keys = resolveTrustedFavoriteKeys(withEin);
assert.equal(keys.hasEin, true);
assert.equal(keys.ein, "123456789");
assert.equal(keys.entityKey, "trusted:example-org");
assert.equal(keys.toggleKey, "123456789");

assert.equal(isTrustedResourceFavorited(withEin, ["123456789"], []), true);
assert.equal(isTrustedResourceFavorited(withEin, [], ["trusted:example-org"]), true);
assert.equal(isTrustedResourceFavorited(withEin, [], []), false);

const slugOnly = { trustedResourceSlug: "no-ein-org", name: "No EIN" };
const slugKeys = resolveTrustedFavoriteKeys(slugOnly);
assert.equal(slugKeys.hasEin, false);
assert.equal(slugKeys.toggleKey, "trusted:no-ein-org");

let einToggles = 0;
let entityToggles = 0;
let signIns = 0;
const toggled = toggleTrustedResourceFavorite({
  resource: withEin,
  isAuthenticated: true,
  canSave: true,
  toggleFavoriteEin: () => {
    einToggles += 1;
  },
  toggleFavoriteEntityKey: () => {
    entityToggles += 1;
  },
});
assert.equal(toggled.ok, true);
assert.equal(toggled.mode, "ein");
assert.equal(einToggles, 1);
assert.equal(entityToggles, 0);

const authRequired = toggleTrustedResourceFavorite({
  resource: withEin,
  isAuthenticated: false,
  canSave: false,
  toggleFavoriteEin: () => {
    einToggles += 1;
  },
  toggleFavoriteEntityKey: () => {
    entityToggles += 1;
  },
  onRequestSignIn: () => {
    signIns += 1;
  },
});
assert.equal(authRequired.ok, false);
assert.equal(authRequired.reason, "auth_required");
assert.equal(signIns, 1);

const vm = buildTrustedResourceViewModel({
  trustedResourceSlug: "wars-end",
  display_name: "War's End",
  ein: "991112223",
  description: "Support for veterans.",
});
assert.equal(vm.ein, "991112223");
assert.equal(vm.directoryNonprofitId, "991112223");
assert.equal(vm.einIdentityVerified, true);

console.log("test-trusted-favorites: ok");
