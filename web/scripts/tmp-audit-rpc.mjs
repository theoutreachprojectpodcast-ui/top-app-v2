import { createClient } from "@supabase/supabase-js";

function env(n) {
  return String(process.env[n] || "").replace(/[\r\n]+/g, "").trim();
}

const admin = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

for (const fn of ["_top_linter_security_status", "_top_rls_security_audit", "_torp_rls_security_audit"]) {
  const { data, error } = await admin.rpc(fn);
  if (error) {
    console.log(fn, "missing:", error.message?.slice(0, 80));
    continue;
  }
  const fails = (data || []).filter((r) => r.status === "FAIL");
  console.log(fn, "FAIL count:", fails.length);
  for (const row of fails) console.log(" ", row);
}
