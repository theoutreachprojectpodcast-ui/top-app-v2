import { createClient } from "@supabase/supabase-js";

function env(n) {
  return String(process.env[n] || "").replace(/[\r\n]+/g, "").trim();
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

for (const table of ["billing_remediation_log", "admin_audit_logs", "top_profiles"]) {
  const { error } = await anon.from(table).insert({ notes: "rls_probe_delete_me" });
  console.log(table, "insert", error ? `BLOCKED: ${error.code} ${error.message?.slice(0, 80)}` : "ALLOWED (BAD)");
  if (!error) {
    await anon.from(table).delete().eq("notes", "rls_probe_delete_me");
  }
}
