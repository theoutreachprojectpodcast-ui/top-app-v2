/**
 * Compare service-role vs anon access per table.
 */
import { createClient } from "@supabase/supabase-js";

function env(n) {
  return String(process.env[n] || "").replace(/[\r\n]+/g, "").trim();
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

const TABLES = [
  "billing_remediation_log",
  "admin_audit_logs",
  "top_profiles",
  "community_posts",
  "billing_records",
  "form_submissions",
];

for (const table of TABLES) {
  const svc = await admin.from(table).select("*", { count: "exact", head: true });
  const pub = await anon.from(table).select("*", { count: "exact", head: true });
  console.log(table, {
    svcCount: svc.count,
    svcErr: svc.error?.message?.slice(0, 60),
    anonCount: pub.count,
    anonErr: pub.error?.message?.slice(0, 60),
    leak: svc.count > 0 && pub.count > 0,
  });
}
