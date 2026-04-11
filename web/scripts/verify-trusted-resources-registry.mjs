/**
 * Trusted Resources registry gate — run after any change to trustedResourcesRegistry.js (also runs on prebuild).
 *
 * Manual review checklist for NEW records:
 * - Confirm displayName matches the org’s official public name (card shows this string verbatim).
 * - Confirm EIN(s) against IRS / profile; add common DB variants if needed.
 * - Add nameKeys for legal name, DBA, and typical directory misspellings.
 * - Confirm website + socialOverrides are official only.
 * - Load Trusted Resources in the app and visually verify the card.
 */

import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const registryUrl = pathToFileURL(
  path.join(__dirname, "../src/features/trusted-resources/trustedResourcesRegistry.js")
).href;

const { TRUSTED_RESOURCE_CANONICAL_RECORDS, canonicalHostname } = await import(registryUrl);

function normEin(ein) {
  let d = String(ein || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length > 9) d = d.slice(-9);
  return d.padStart(9, "0");
}

function compactKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const VALID_CATEGORY_KEYS = new Set([
  "recreationSports",
  "artsCulture",
  "publicBenefit",
  "religionSpirituality",
  "healthWellness",
  "education",
  "humanServices",
  "veteransMilitary",
  "firstRespondersSafety",
  "communityDevelopment",
  "environmentAnimals",
  "youthDevelopment",
  "crisisEmergency",
  "advocacyPolicyRights",
  "unknownGeneral",
]);

function looksLikeCamelJoin(s) {
  return /[a-z][A-Z]/.test(s);
}

const errors = [];
const einOwner = new Map();
const shortNameKeysOk = new Set(["uso", "wwp", "t2t", "snd"]);

for (let i = 0; i < TRUSTED_RESOURCE_CANONICAL_RECORDS.length; i += 1) {
  const r = TRUSTED_RESOURCE_CANONICAL_RECORDS[i];
  const label = r.slug || `record[${i}]`;

  if (!r.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug)) {
    errors.push(`[${label}] slug must be lowercase kebab-case`);
  }
  if (!r.displayName || String(r.displayName).trim().length < 2) {
    errors.push(`[${label}] displayName required (min 2 chars)`);
  }
  const dn = String(r.displayName || "").trim();
  if (/\s{2,}/.test(dn)) {
    errors.push(`[${label}] displayName must not contain double spaces`);
  }
  if (looksLikeCamelJoin(dn)) {
    errors.push(`[${label}] displayName looks like camelCase — use human words (e.g. "Wounded Warrior Project")`);
  }
  if (!r.trustedResourceCategoryKey || !VALID_CATEGORY_KEYS.has(r.trustedResourceCategoryKey)) {
    errors.push(`[${label}] trustedResourceCategoryKey must be a valid categoryMapper key`);
  }
  if (!r.shortDescription || String(r.shortDescription).trim().length < 20) {
    errors.push(`[${label}] shortDescription should be at least ~20 chars for card quality`);
  }
  if (!r.locationLabel || !String(r.locationLabel).trim()) {
    errors.push(`[${label}] locationLabel required`);
  }
  if (!r.website || !/^https:\/\//i.test(String(r.website))) {
    errors.push(`[${label}] website must be an https URL`);
  }
  const eins = Array.isArray(r.eins) ? r.eins : [];
  const nameKeys = Array.isArray(r.nameKeys) ? r.nameKeys : [];
  if (!eins.length && !nameKeys.length) {
    errors.push(`[${label}] add at least one EIN or nameKeys for matching`);
  }
  for (const e of eins) {
    const n = normEin(e);
    if (n.length !== 9 || !/^\d{9}$/.test(n)) {
      errors.push(`[${label}] invalid EIN: ${e}`);
      continue;
    }
    const prev = einOwner.get(n);
    if (prev && prev !== label) {
      errors.push(`[${label}] EIN ${n} duplicates [${prev}]`);
    } else {
      einOwner.set(n, label);
    }
  }
  for (const nk of nameKeys) {
    if (!String(nk || "").trim()) {
      errors.push(`[${label}] empty nameKey`);
    }
    const ck = compactKey(nk);
    if (ck.length < 3 && !shortNameKeysOk.has(ck)) {
      errors.push(`[${label}] nameKey too short: "${nk}" (risky for matching)`);
    }
  }
}

const hostOwner = new Map();
function claimHost(h, slug) {
  if (!h) return;
  const prev = hostOwner.get(h);
  if (prev && prev !== slug) {
    errors.push(`hostname "${h}" claimed by [${prev}] and [${slug}]`);
  } else {
    hostOwner.set(h, slug);
  }
}
for (const r of TRUSTED_RESOURCE_CANONICAL_RECORDS) {
  const label = r.slug || "record";
  const primary = canonicalHostname(r.website);
  if (!primary) errors.push(`[${label}] website must have a parseable hostname`);
  claimHost(primary, label);
  for (const a of r.aliasHosts || []) {
    if (typeof a !== "string" || !String(a).trim()) {
      errors.push(`[${label}] aliasHosts must be non-empty strings`);
      continue;
    }
    claimHost(canonicalHostname(a.includes("://") ? a : `https://${a}/`), label);
  }
}

if (errors.length) {
  console.error("Trusted Resources registry verification failed:\n");
  for (const e of errors) console.error(`  • ${e}`);
  console.error(
    "\nFix trustedResourcesRegistry.js, then run: pnpm verify:trusted-resources\n"
  );
  process.exit(1);
}

console.log(
  `Trusted Resources registry OK — ${TRUSTED_RESOURCE_CANONICAL_RECORDS.length} canonical record(s). New entries still need a UI spot-check on the Trusted Resources tab.`
);
