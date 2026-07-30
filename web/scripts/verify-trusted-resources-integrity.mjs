/**
 * Integrity gate for Trusted Resources (CI / prebuild).
 * Offline-safe: curated registry + source-path contracts (no @/ alias imports).
 */

import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

const registryUrl = pathToFileURL(
  path.join(webRoot, "src/features/trusted-resources/trustedResourcesRegistry.js"),
).href;
const { TRUSTED_RESOURCE_CANONICAL_RECORDS, TRUSTED_RESOURCE_BY_SLUG } = await import(registryUrl);

const errors = [];
const FORBIDDEN_COPY = "Could not load this organization";

const trustedSrcRoots = [
  path.join(webRoot, "src/features/trusted-resources"),
  path.join(webRoot, "src/app/trusted"),
  path.join(webRoot, "src/app/api/trusted"),
];

function walkJsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJsFiles(full, out);
    else if (/\.(js|jsx|mjs|ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

for (const root of trustedSrcRoots) {
  for (const file of walkJsFiles(root)) {
    const text = fs.readFileSync(file, "utf8");
    if (text.includes(FORBIDDEN_COPY)) {
      errors.push(`[forbidden-copy] ${path.relative(webRoot, file)} contains "${FORBIDDEN_COPY}"`);
    }
  }
}

const nonprofitCard = path.join(webRoot, "src/features/nonprofits/components/NonprofitCard.jsx");
if (fs.existsSync(nonprofitCard)) {
  const text = fs.readFileSync(nonprofitCard, "utf8");
  if (!text.includes('`/trusted/${trustedSlug}`') && !text.includes("/trusted/${trustedSlug}")) {
    errors.push("[card-link] NonprofitCard must build trustedDetailPath as /trusted/${trustedSlug}");
  }
  if (!text.includes("trustedResourceSlug")) {
    errors.push("[card-link] NonprofitCard must read card.trustedResourceSlug");
  }
  // Trusted mode must not force EIN directory profile as the primary hit target.
  if (/isTrustedResourcesCard[\s\S]{0,400}profilePath = einDigits/.test(text.replace(/\s+/g, " "))) {
    errors.push("[card-link] Trusted cards must not default profilePath to /nonprofit/{ein}");
  }
}

const catalogApi = path.join(
  webRoot,
  "src/features/trusted-resources/api/trustedResourceCatalogApi.js",
);
if (fs.existsSync(catalogApi)) {
  const text = fs.readFileSync(catalogApi, "utf8");
  if (text.includes("!TRUSTED_RESOURCE_BY_SLUG[key]) return null")) {
    errors.push("[resolve] Catalog detail must not hard-gate solely on registry membership");
  }
}

const slugPage = path.join(webRoot, "src/app/trusted/[slug]/page.js");
if (!fs.existsSync(slugPage)) {
  errors.push("[route] Missing /trusted/[slug] page");
}

const slugSeen = new Map();
for (const record of TRUSTED_RESOURCE_CANONICAL_RECORDS) {
  const slug = String(record.slug || "").trim().toLowerCase();
  const label = slug || record.displayName || "?";
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    errors.push(`[${label}] slug must be lowercase kebab-case`);
    continue;
  }
  if (slugSeen.has(slug)) {
    errors.push(`[${slug}] duplicate registry slug (also ${slugSeen.get(slug)})`);
  } else {
    slugSeen.set(slug, record.displayName);
  }
  if (!record.displayName || String(record.displayName).trim().length < 2) {
    errors.push(`[${slug}] displayName required`);
  }
  const hasSource =
    Boolean(String(record.website || "").trim()) ||
    Boolean(String(record.shortDescription || "").trim());
  if (!hasSource) {
    errors.push(`[${slug}] needs website or shortDescription`);
  }
  if (!TRUSTED_RESOURCE_BY_SLUG[slug]) {
    errors.push(`[${slug}] missing from TRUSTED_RESOURCE_BY_SLUG map`);
  }
}

const registryCount = TRUSTED_RESOURCE_CANONICAL_RECORDS.length;
const bySlugCount = Object.keys(TRUSTED_RESOURCE_BY_SLUG).length;
if (registryCount !== bySlugCount) {
  errors.push(`registry list (${registryCount}) != BY_SLUG map (${bySlugCount})`);
}

if (errors.length) {
  console.error("Trusted resources integrity FAILED:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

console.log(
  `Trusted resources integrity OK — ${registryCount} published registry resources with unique slugs and valid card→/trusted/[slug] contracts.`,
);
