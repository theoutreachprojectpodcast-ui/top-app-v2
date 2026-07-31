#!/usr/bin/env node
/**
 * IRS EO BMF nonprofit import CLI.
 *
 * Examples:
 *   node --import ./scripts/register-at-alias.mjs scripts/irs-nonprofit-import.mjs --dry-run --state=dc
 *   node --import ./scripts/register-at-alias.mjs scripts/irs-nonprofit-import.mjs --apply --state=dc --from-dry-run=<uuid>
 *   node --import ./scripts/register-at-alias.mjs scripts/irs-nonprofit-import.mjs --dry-run --state=all --subsection=19
 *
 * Classification: "5019a" → 501(c)(19) → EO BMF SUBSECTION=19 (default).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { EO_BMF_STATE_KEYS } from "@/lib/irs/eoBmfClient";
import { classificationSummary } from "@/lib/irs/classification";
import { reportIrsNonprofitImport, runIrsNonprofitImport } from "@/lib/irs/importService";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const candidates = [".env.vercel.production", ".env.production.local", ".env.local"];
  for (const rel of candidates) {
    const envPath = path.join(webRoot, rel);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      val = val.replace(/\\r\\n/g, "").replace(/\\n/g, "").replace(/\\r/g, "").replace(/[\r\n]+/g, "").trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function parseArgs(argv) {
  const out = {
    mode: "dry_run",
    states: ["dc"],
    subsection: "19",
    limit: null,
    fromDryRun: null,
    enforceDryRunGate: true,
    help: false,
  };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--report-only") out.mode = "report_only";
    else if (arg === "--dry-run") out.mode = "dry_run";
    else if (arg === "--apply") out.mode = "apply";
    else if (arg === "--no-dry-run-gate") out.enforceDryRunGate = false;
    else if (arg.startsWith("--state=")) {
      const v = arg.slice("--state=".length).trim().toLowerCase();
      out.states =
        v === "all"
          ? [...EO_BMF_STATE_KEYS]
          : v.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    } else if (arg.startsWith("--subsection=")) {
      out.subsection = arg.slice("--subsection=".length).trim();
    } else if (arg.startsWith("--limit=")) {
      out.limit = Number(arg.slice("--limit=".length));
    } else if (arg.startsWith("--from-dry-run=")) {
      out.fromDryRun = arg.slice("--from-dry-run=".length).trim();
    }
  }
  return out;
}

function printHelp() {
  console.log(`IRS nonprofit import (EO BMF)

Interpretation of "5019a": ${JSON.stringify(classificationSummary(), null, 2)}

Usage:
  pnpm run irs:import:report -- --state=dc
  pnpm run irs:import:dry -- --state=dc
  pnpm run irs:import:apply -- --state=dc --from-dry-run=<batch-uuid>

Flags:
  --report-only          Download/filter/report with no database writes
  --dry-run              Plan against DB + write batch log only (default)
  --apply                Write organizations (requires successful dry-run unless --no-dry-run-gate)
  --state=dc,va          State file keys (or --state=all)
  --subsection=19        EO BMF SUBSECTION filter (default 19 = 501(c)(19))
  --limit=N              Cap matched records
  --from-dry-run=<uuid>  Successful dry-run batch id (required for --apply)
  --no-dry-run-gate      Skip dry-run gate (QA only)
`);
}

async function main() {
  loadEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log("[irs-import] classification:", classificationSummary().interpretedAs, "→ subsection", args.subsection);
  console.log("[irs-import] mode:", args.mode, "states:", args.states.join(","));

  if (args.mode === "report_only") {
    const result = await reportIrsNonprofitImport({
      states: args.states,
      subsection: args.subsection,
      limit: Number.isFinite(args.limit) ? args.limit : null,
    });
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exit(2);
    return;
  }

  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const result = await runIrsNonprofitImport(supabase, {
    mode: args.mode,
    states: args.states,
    subsection: args.subsection,
    limit: Number.isFinite(args.limit) ? args.limit : null,
    dryRunBatchId: args.fromDryRun,
    enforceDryRunGate: args.mode === "apply" ? args.enforceDryRunGate : false,
    actor: {
      email: process.env.IRS_IMPORT_ACTOR_EMAIL || "cli@local",
      workosUserId: process.env.IRS_IMPORT_ACTOR_ID || null,
    },
  });

  console.log(JSON.stringify({
    ok: result.ok,
    batchId: result.batch?.id,
    mode: result.mode,
    summary: result.summary,
    classification: result.classification,
  }, null, 2));

  if (!result.ok) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
