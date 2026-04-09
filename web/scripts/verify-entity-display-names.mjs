/**
 * Entity title / naming QA gate — runs in prebuild with proven-allies verification.
 *
 * Checks:
 * - Trusted Resources registry displayName strings (no EIN, no machine joins, etc.)
 * - Featured sponsor names
 * - Core resolution + audit helpers behave (regression fixtures)
 *
 * For full UI coverage, mapNonprofitCardRow and pages still rely on the shared
 * `entityDisplayName` + `nonprofitCardMapper` pipeline at runtime.
 */

import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entityUrl = pathToFileURL(path.join(__dirname, "../src/lib/entityDisplayName.js")).href;
const registryUrl = pathToFileURL(
  path.join(__dirname, "../src/features/trusted-resources/provenAllyRegistry.js")
).href;
const sponsorsUrl = pathToFileURL(
  path.join(__dirname, "../src/features/sponsors/data/featuredSponsors.js")
).href;

const {
  auditEntityTitleSlot,
  auditRegistryDisplayName,
  resolveOrganizationCardTitle,
  stripOrganizationTitleArtifacts,
} = await import(entityUrl);

const { PROVEN_ALLY_CANONICAL_RECORDS } = await import(registryUrl);
const { FEATURED_SPONSORS } = await import(sponsorsUrl);

const errors = [];

function fail(msg) {
  errors.push(msg);
}

// --- Registry ---
for (let i = 0; i < PROVEN_ALLY_CANONICAL_RECORDS.length; i += 1) {
  const r = PROVEN_ALLY_CANONICAL_RECORDS[i];
  const label = r.slug || `record[${i}]`;
  const issues = auditRegistryDisplayName(r);
  for (const iss of issues) {
    fail(`[registry:${label}] ${iss.code}: ${iss.message}`);
  }
}

// --- Featured sponsors ---
for (const s of FEATURED_SPONSORS) {
  const issues = auditEntityTitleSlot(s.name, { slot: "card", allowShortAllCaps: true });
  for (const iss of issues) {
    if (iss.code === "empty") fail(`[sponsor:${s.id || "?"}] empty name`);
    else fail(`[sponsor:${s.id || "?"}] ${iss.code}: ${iss.message}`);
  }
}

// --- Strip + resolve fixtures ---
const stripCases = [
  ["Freedom Alliance (EIN 11-2482262)", "Freedom Alliance"],
  ["Trusted Resource — Acme Corp", "Trusted Resource — Acme Corp"], // middle em dash name: tail only strips status
];
for (const [input, expect] of stripCases) {
  const out = stripOrganizationTitleArtifacts(input);
  if (out !== expect) {
    fail(`stripOrganizationTitleArtifacts("${input}") => "${out}" (expected "${expect}")`);
  }
}

const resolved = resolveOrganizationCardTitle({
  trustCanonical: false,
  candidateNames: ["trusted resource (EIN 12-3456789)", "Real Hope Foundation"],
  provenAllySlug: "",
  emptyFallback: "Organization",
});
if (resolved !== "Real Hope Foundation") {
  fail(`resolveOrganizationCardTitle should skip bad first candidate; got "${resolved}"`);
}

const resolved2 = resolveOrganizationCardTitle({
  trustCanonical: false,
  candidateNames: [],
  provenAllySlug: "",
  emptyFallback: "Saved organization",
});
if (resolved2 !== "Saved organization") {
  fail(`expected Saved organization fallback, got "${resolved2}"`);
}

const badTitles = [
  "Trusted resource",
  "Proven Ally",
  "ACME_CORP_NAME",
  "status: approved",
];
for (const t of badTitles) {
  const issues = auditEntityTitleSlot(t, { slot: "card" });
  if (!issues.length) fail(`auditEntityTitleSlot should flag bad title: "${t}"`);
}

// --- Source scan: forbidden title-slot patterns (lightweight static guard) ---
const srcRoot = path.join(__dirname, "../src");
const forbiddenPatterns = [
  { re: /Trusted resource \(EIN/gi, msg: 'Literal "Trusted resource (EIN" in source — use title resolver / no EIN in titles' },
  { re: /orgName:\s*`Saved organization \(\$\{/g, msg: "Saved-org fallback must not embed EIN in orgName template" },
];

function walkDir(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkDir(p, files);
    else if (/\.(jsx?|tsx?)$/.test(ent.name)) files.push(p);
  }
  return files;
}

for (const file of walkDir(srcRoot)) {
  const text = fs.readFileSync(file, "utf8");
  for (const { re, msg } of forbiddenPatterns) {
    re.lastIndex = 0;
    if (re.test(text)) {
      fail(`[scan:${path.relative(srcRoot, file)}] ${msg}`);
    }
  }
}

if (errors.length) {
  console.error("Entity display name verification failed:\n");
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

console.log(
  `Entity display names OK — registry ${PROVEN_ALLY_CANONICAL_RECORDS.length} record(s), ${FEATURED_SPONSORS.length} sponsor(s), fixtures + source scan.`
);
