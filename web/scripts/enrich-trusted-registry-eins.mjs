/**
 * Batch website enrichment for Trusted Resources / directory EINs (non-destructive POST to API).
 *
 * Usage (dev server must be running):
 *   cd web && BASE_URL=http://localhost:3001 pnpm exec node scripts/enrich-trusted-registry-eins.mjs
 *
 * Requires server env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or anon for read-only failures).
 * Throttles requests to avoid hammering external sites.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = join(__dirname, "../src/features/trusted-resources/trustedResourcesRegistry.js");

function extractEinsFromRegistrySource(src) {
  const out = new Set();
  const re = /\beins:\s*\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(src))) {
    const inner = m[1];
    for (const part of inner.split(",")) {
      const digits = part.replace(/\D/g, "");
      if (digits.length === 9) out.add(digits);
    }
  }
  return [...out];
}

const base = (process.env.BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const delayMs = Number(process.env.ENRICH_DELAY_MS || 800);

const src = readFileSync(registryPath, "utf8");
const eins = extractEinsFromRegistrySource(src);

if (!eins.length) {
  console.error("No EINs found in trustedResourcesRegistry.js — check script regex if registry format changed.");
  process.exit(1);
}

console.log(`Enriching ${eins.length} EIN(s) against ${base}/api/nonprofit/enrich …`);

for (const ein of eins) {
  try {
    const res = await fetch(`${base}/api/nonprofit/enrich`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ein }),
    });
    const body = await res.json().catch(() => ({}));
    console.log(ein, res.status, body.ok ? "ok" : body.error || body.detail || "fail");
  } catch (e) {
    console.error(ein, "error", e.message);
  }
  await new Promise((r) => setTimeout(r, delayMs));
}

console.log("Done.");
