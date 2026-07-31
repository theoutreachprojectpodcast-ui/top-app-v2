/**
 * Promote legacy trusted:{slug} profile favorites to EIN rows when the registry has an EIN.
 * Default: read-only report. Pass --apply to write.
 *
 *   node scripts/repair-trusted-favorite-keys.mjs
 *   node scripts/repair-trusted-favorite-keys.mjs --apply
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  resolveTrustedSlugToEin,
  normalizeTrustedEntityKey,
  SAVED_ORG_TABLE,
} from "../src/lib/savedOrganizations/savedOrganizationsService.js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");

function loadEnv(rel) {
  const p = path.join(webRoot, rel);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    v = v.replace(/\\r\\n/g, "").replace(/[\r\n]+/g, "").trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(".env.vercel.production.fresh");
loadEnv(".env.vercel.production.pulled");
loadEnv(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const profileTable = process.env.NEXT_PUBLIC_PROFILE_TABLE || "top_profiles";
if (!url || !key) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data: profiles, error } = await admin
  .from(profileTable)
  .select("id,workos_user_id,email,metadata");
if (error) throw error;

const report = { scanned: 0, withKeys: 0, promotable: 0, promoted: 0, keptSlug: 0, details: [] };

for (const p of profiles || []) {
  report.scanned += 1;
  const meta = p.metadata && typeof p.metadata === "object" && !Array.isArray(p.metadata) ? p.metadata : {};
  const keys = Array.isArray(meta.favoriteEntityKeys)
    ? [...new Set(meta.favoriteEntityKeys.map(normalizeTrustedEntityKey).filter(Boolean))]
    : [];
  if (!keys.length) continue;
  report.withKeys += 1;

  const remaining = [];
  const toPromote = [];
  for (const key of keys) {
    const slug = key.replace(/^trusted:/, "");
    const ein = resolveTrustedSlugToEin(slug);
    if (ein) {
      toPromote.push({ key, ein });
      report.promotable += 1;
    } else {
      remaining.push(key);
      report.keptSlug += 1;
    }
  }

  if (!toPromote.length) continue;
  report.details.push({
    email: p.email,
    workosUserId: p.workos_user_id,
    promote: toPromote,
    keep: remaining,
  });

  if (!apply) continue;
  if (!p.workos_user_id) continue;

  for (const item of toPromote) {
    const { error: upsErr } = await admin.from(SAVED_ORG_TABLE).upsert(
      { user_id: p.workos_user_id, ein: item.ein, sort_order: 0 },
      { onConflict: "user_id,ein" },
    );
    if (upsErr) {
      console.error("upsert failed", p.email, item, upsErr.message);
      remaining.push(item.key);
      continue;
    }
    report.promoted += 1;
  }

  const nextMeta = { ...meta, favoriteEntityKeys: remaining };
  const { error: patchErr } = await admin
    .from(profileTable)
    .update({ metadata: nextMeta, updated_at: new Date().toISOString() })
    .eq("id", p.id);
  if (patchErr) console.error("metadata patch failed", p.email, patchErr.message);
}

console.log(JSON.stringify({ apply, ...report, details: report.details.slice(0, 50) }, null, 2));
if (!apply) console.log("\nDry run only. Re-run with --apply to write promotions.");
