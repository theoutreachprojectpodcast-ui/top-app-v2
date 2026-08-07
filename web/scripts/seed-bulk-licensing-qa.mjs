/**
 * Seed QA helper rows for bulk licensing (does not charge Stripe).
 * Creates placeholder orgs for each package size with fake pending status.
 *
 * Usage (requires service role env):
 *   node --import ./scripts/register-at-alias.mjs scripts/seed-bulk-licensing-qa.mjs
 *   node --import ./scripts/register-at-alias.mjs scripts/seed-bulk-licensing-qa.mjs --apply
 */
import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE URL or SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const packages = [25, 50, 100, 200];

async function main() {
  for (const size of packages) {
    const code = `QA${size}`;
    const row = {
      name: `QA Bulk Org ${size}`,
      business_code: code,
      purchaser_name: "QA Owner",
      purchaser_email: `qa-bulk-${size}@example.com`,
      billing_email: `qa-bulk-${size}@example.com`,
      status: "pending_payment",
      organization_type: "qa_seed",
      updated_at: new Date().toISOString(),
    };
    console.log(apply ? "UPSERT" : "DRY-RUN", row);
    if (!apply) continue;
    const { error } = await admin.from("bulk_organizations").upsert(row, {
      onConflict: "business_code",
    });
    if (error) console.error(code, error.message);
  }
  console.log(apply ? "Seed applied." : "Dry run only. Pass --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
