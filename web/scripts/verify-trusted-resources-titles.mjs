/**
 * Trusted Resources title pipeline regression checks (runs in prebuild).
 * Ensures directory/enrichment-backed resolution never degrades to generic "Organization"
 * when real data or website hints exist.
 */

import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entityUrl = pathToFileURL(path.join(__dirname, "../src/lib/entityDisplayName.js")).href;

const { resolveTrustedResourceDisplayName, sanitizeOrganizationNameForDisplay, titleHintFromWebsiteUrl } = await import(entityUrl);

const errors = [];

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

assert(
  resolveTrustedResourceDisplayName({
    trustCanonical: true,
    canonicalDisplayName: "Freedom Alliance",
    candidateNames: [],
    emptyFallback: "Organization",
  }) === "Freedom Alliance",
  "Registry canonical display name must pass through verbatim"
);

assert(
  resolveTrustedResourceDisplayName({
    candidateNames: ["Wounded Warrior Project"],
    emptyFallback: "Organization",
  }) === "Wounded Warrior Project",
  "First valid candidate must win over Organization fallback"
);

const slugResolved = resolveTrustedResourceDisplayName({
  candidateNames: [],
  trustedResourceSlug: "wounded-warrior-project",
  websiteUrl: "",
  emptyFallback: "Organization",
});
assert(
  /wounded/i.test(slugResolved) && slugResolved !== "Organization",
  `Slug humanization expected meaningful title, got "${slugResolved}"`
);

const webResolved = resolveTrustedResourceDisplayName({
  candidateNames: [],
  trustedResourceSlug: "",
  websiteUrl: "https://www.hopeforthewarriors.org",
  emptyFallback: "Organization",
});
assert(
  webResolved !== "Organization" && String(webResolved).trim().length > 2,
  `Website hostname hint should avoid Organization fallback, got "${webResolved}"`
);

const hint = titleHintFromWebsiteUrl("https://www.braintreatmentcenter.com/");
assert(hint.length > 2, `titleHintFromWebsiteUrl expected non-empty, got "${hint}"`);

assert(
  sanitizeOrganizationNameForDisplay("FreedomAlliance", { trustCanonical: false }) === "Freedom Alliance",
  "camel joined name should become spaced title case"
);
assert(
  sanitizeOrganizationNameForDisplay("brain_treatment_center", { trustCanonical: false }) === "Brain Treatment Center",
  "snake_case name should become spaced title case"
);
assert(
  sanitizeOrganizationNameForDisplay("Freedomalliance", { trustCanonical: false }) === "Freedom Alliance",
  "single-token joined name should split common nonprofit suffixes"
);

if (errors.length) {
  console.error("Trusted Resources title verification failed:\n");
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

console.log("Trusted Resources title pipeline OK — canonical, candidates, slug, and website hint paths.");
