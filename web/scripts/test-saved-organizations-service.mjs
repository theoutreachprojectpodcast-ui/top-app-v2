/**
 * Unit tests for shared saved-organizations service + trusted favorite key promotion.
 * Run: node --import ./scripts/register-at-alias.mjs scripts/test-saved-organizations-service.mjs
 */
import assert from "node:assert/strict";
import {
  normalizeTrustedEntityKey,
  orderUniqueEins,
  resolveTrustedSlugToEin,
  resolveTrustedEntityKeyCards,
  trustedRegistryEinSet,
  SAVED_ORG_ERRORS,
} from "../src/lib/savedOrganizations/savedOrganizationsService.js";
import { nonprofitExistsForSave } from "../src/lib/savedOrganizations/resolveSavedOrganizations.js";
import {
  resolveTrustedFavoriteKeys,
  isTrustedResourceFavorited,
  toggleTrustedResourceFavorite,
} from "../src/features/trusted-resources/domain/trustedFavoriteKeys.js";
import { canSaveOrganizations } from "../src/lib/membership/membershipAccess.js";

assert.equal(normalizeTrustedEntityKey("Trusted:Warriors-Refuge"), "trusted:warriors-refuge");
assert.equal(normalizeTrustedEntityKey("sponsor:x"), "");
assert.deepEqual(orderUniqueEins(["12-3456789", "123456789", "bad"]), ["123456789"]);

assert.equal(resolveTrustedSlugToEin("veterans-creed-outdoors"), "845036165");
assert.equal(resolveTrustedSlugToEin("warriors-refuge"), "833787674");
assert.equal(resolveTrustedSlugToEin("the-warriors-refuge"), "833787674");
assert.equal(resolveTrustedSlugToEin("m-o-s-veteran-adventures"), "");

const registryEins = trustedRegistryEinSet();
assert.ok(registryEins.has("845036165"));
assert.ok(registryEins.has("833787674"));
assert.ok(registryEins.has("331313139"));

{
  const cards = resolveTrustedEntityKeyCards(["trusted:veterans-creed-outdoors", "trusted:unknown-slug"]);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].name, "Veterans Creed Outdoors");
  assert.equal(cards[0].savedResolutionStatus, "resolved");
  assert.equal(cards[1].savedResolutionStatus, "unavailable");
}

{
  const keys = resolveTrustedFavoriteKeys({
    trustedResourceSlug: "veterans-creed-outdoors",
    ein: "",
    directoryNonprofitId: "",
  });
  assert.equal(keys.hasEin, true);
  assert.equal(keys.ein, "845036165");
}

{
  const favorited = isTrustedResourceFavorited(
    { trustedResourceSlug: "warriors-refuge", ein: "833787674" },
    ["833787674"],
    [],
  );
  assert.equal(favorited, true);
}

{
  let savedEin = null;
  const result = toggleTrustedResourceFavorite({
    resource: { trustedResourceSlug: "veterans-creed-outdoors", name: "Veterans Creed Outdoors" },
    isAuthenticated: true,
    canSave: true,
    toggleFavoriteEin: (ein) => {
      savedEin = ein;
    },
    toggleFavoriteEntityKey: () => {
      throw new Error("should prefer EIN");
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.mode, "ein");
  assert.equal(savedEin, "845036165");
}

{
  // Active Support must be able to save (legacy subscribers awaiting Support→Pro migration).
  assert.equal(
    canSaveOrganizations({
      membershipTier: "support",
      membershipBillingStatus: "active",
      membershipSource: "stripe",
    }),
    true,
  );
  assert.equal(
    canSaveOrganizations({
      membershipTier: "member",
      membershipBillingStatus: "active",
      membershipSource: "stripe",
    }),
    true,
  );
  assert.equal(
    canSaveOrganizations({
      membershipTier: "free",
      membershipBillingStatus: "none",
    }),
    false,
  );
}

{
  // Registry EIN must pass existence even with empty DB mocks.
  const empty = {
    from() {
      const api = {
        select() {
          return api;
        },
        in() {
          return api;
        },
        limit() {
          return api;
        },
        then(resolve) {
          return Promise.resolve({ data: [], error: null }).then(resolve);
        },
      };
      return api;
    },
  };
  assert.equal(await nonprofitExistsForSave(empty, "845036165"), true);
  assert.equal(await nonprofitExistsForSave(empty, "000000000"), false);
}

assert.equal(SAVED_ORG_ERRORS.ORGANIZATION_NOT_FOUND, "organization_not_found");
console.log("test-saved-organizations-service: ok");
