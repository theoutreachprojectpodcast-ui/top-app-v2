/** Probe known public tables for anon read leaks vs service role. */
import { createClient } from "@supabase/supabase-js";

function env(n) {
  return String(process.env[n] || "").replace(/[\r\n]+/g, "").trim();
}

const admin = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
const anon = createClient(
  env("NEXT_PUBLIC_SUPABASE_URL"),
  env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"),
  { auth: { persistSession: false } },
);

const TABLES = [
  "billing_remediation_log",
  "top_profiles",
  "top_qa_profiles",
  "top_oauth_mobile_handoffs",
  "admin_audit_logs",
  "billing_records",
  "community_posts",
  "community_post_likes",
  "community_post_reactions",
  "community_follows",
  "sponsor_applications",
  "trusted_resource_applications",
  "form_submissions",
  "podcast_episodes",
  "podcasts",
  "sponsors_catalog",
  "trusted_resources",
  "page_content_blocks",
  "top_platform_notifications",
  "top_app_saved_org_eins",
  "podcast_sponsor_checkout_events",
];

const leaks = [];
const noRlsSuspect = [];

for (const table of TABLES) {
  const svc = await admin.from(table).select("*", { count: "exact", head: true });
  if (svc.error) continue;
  const pub = await anon.from(table).select("*", { count: "exact", head: true });
  const ins = await anon.from(table).insert({}).select();
  const rlsOn = ins.error?.code === "42501" || /row-level security/i.test(ins.error?.message || "");
  const pubCount = pub.error ? null : pub.count;
  if (pubCount > 0 && (svc.count ?? 0) > 0 && table !== "community_posts") {
    leaks.push({ table, svc: svc.count, anon: pubCount });
  }
  if (!rlsOn && !ins.error?.message?.includes("Could not find")) {
    noRlsSuspect.push({ table, insert: ins.error?.message?.slice(0, 60) || "ALLOWED" });
  }
  console.log(
    table.padEnd(35),
    `svc=${String(svc.count ?? 0).padStart(3)}`,
    `anon=${pubCount === null ? "ERR" : String(pubCount).padStart(3)}`,
    rlsOn ? "RLS" : "NO-RLS?",
  );
}

console.log("\nSensitive leaks:", leaks);
console.log("No RLS suspect:", noRlsSuspect);
