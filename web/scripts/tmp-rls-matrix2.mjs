import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function load(rel) {
  for (const l of fs.readFileSync(rel, "utf8").split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    let k = t.slice(0, i);
    let v = t.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    v = v
      .replace(/\\r\\n/g, "")
      .replace(/\\n/g, "")
      .replace(/\\r/g, "")
      .replace(/[\r\n]+/g, "")
      .trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

function clean(n) {
  return String(process.env[n] || "")
    .replace(/\\r\\n/g, "")
    .replace(/\\n/g, "")
    .replace(/\\r/g, "")
    .replace(/[\r\n]+/g, "")
    .trim();
}

load("web/.env.vercel.production");

const url = clean("NEXT_PUBLIC_SUPABASE_URL");
const service = clean("SUPABASE_SERVICE_ROLE_KEY");
const anon = clean("NEXT_PUBLIC_SUPABASE_ANON_KEY") || clean("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");

console.log("url", url);
console.log("service_len", service.length, "prefix", service.slice(0, 20));
console.log("anon_len", anon.length, "prefix", anon.slice(0, 20));

for (const [name, key] of [
  ["anon", anon],
  ["service", service],
]) {
  const r = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/openapi+json",
    },
  });
  const t = await r.text();
  console.log(name, "status", r.status, "ctype", r.headers.get("content-type"));
  console.log(name, "body", t.slice(0, 200).replace(/\n/g, " "));
  try {
    const j = JSON.parse(t);
    console.log(name, "paths", Object.keys(j.paths || {}).length);
  } catch {
    /* ignore */
  }
}

const admin = createClient(url, service, { auth: { persistSession: false } });
const known = [
  "top_profiles",
  "sponsors_catalog",
  "trusted_resources",
  "community_posts",
  "community_comments",
  "community_post_likes",
  "community_post_reactions",
  "community_follows",
  "podcast_episodes",
  "podcasts",
  "podcast_upcoming_guests",
  "podcast_landing_curated_slots",
  "page_content_blocks",
  "admin_settings",
  "admin_audit_logs",
  "billing_records",
  "billing_remediation_log",
  "top_app_saved_org_eins",
  "top_oauth_mobile_handoffs",
  "top_platform_notifications",
  "sponsor_applications",
  "trusted_resource_applications",
  "form_submissions",
  "podcast_sponsor_checkout_events",
  "nonprofits",
  "organizations",
  "membership_plan_configuration",
  "membership_configuration_audit_log",
  "support_to_pro_migration_records",
  "support_to_pro_migration_emails",
  "partner_clicks",
  "click_events",
  "attribution_events",
  "purchase_attributions",
];

const anonClient = createClient(url, anon, { auth: { persistSession: false } });

console.log("\n=== Known table matrix ===");
for (const table of known) {
  const svc = await admin.from(table).select("*", { count: "exact", head: true });
  if (svc.error && /PGRST205|does not exist|Could not find/i.test(svc.error.message || "")) {
    console.log(table.padEnd(40), "MISSING");
    continue;
  }
  if (svc.error) {
    console.log(table.padEnd(40), `svcERR ${svc.error.code} ${String(svc.error.message).slice(0, 60)}`);
    continue;
  }
  const pub = await anonClient.from(table).select("*", { count: "exact", head: true });
  const ins = await anonClient.from(table).insert({}).select();
  let rls = "unknown";
  if (!ins.error) rls = "NO-RLS-OR-PERMISSIVE";
  else if (/row-level security|42501/i.test(`${ins.error.code} ${ins.error.message}`)) rls = "RLS";
  else if (/null value|not-null|check constraint|invalid input|duplicate|foreign key/i.test(ins.error.message || "")) {
    rls = "REACHED-CONSTRAINT";
  } else rls = `ins:${ins.error.code || ins.error.message?.slice(0, 40)}`;
  const pubN = pub.error ? `ERR:${pub.error.code}` : String(pub.count ?? 0);
  console.log(table.padEnd(40), `svc=${String(svc.count ?? 0).padStart(4)}`, `anon=${String(pubN).padStart(8)}`, rls);
}
