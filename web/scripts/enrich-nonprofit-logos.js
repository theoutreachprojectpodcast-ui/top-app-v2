const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DEFAULT_TABLE = process.env.NONPROFIT_SOURCE_TABLE || "nonprofits_search_app_v1";
const WAIT_MS = Number(process.env.LOGO_ENRICH_RATE_MS || 250);

function parseArgs(argv) {
  const flags = {
    force: false,
    dryRun: false,
    limit: 200,
    table: DEFAULT_TABLE,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--force") flags.force = true;
    if (arg === "--dry-run") flags.dryRun = true;
    if (arg === "--limit") flags.limit = Number(argv[i + 1] || 200);
    if (arg === "--table") flags.table = String(argv[i + 1] || DEFAULT_TABLE);
  }
  return flags;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toDomain(website = "") {
  const raw = String(website || "").trim();
  if (!raw) return "";
  const value = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(value);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function getLogoCandidates(website = "") {
  const domain = toDomain(website);
  if (!domain) return [];
  return [
    `https://logo.clearbit.com/${domain}`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://${domain}/favicon.ico`,
  ];
}

async function isValidImage(url) {
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!head.ok) return false;
    const contentType = String(head.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("image")) return false;
    const length = Number(head.headers.get("content-length") || 0);
    return length === 0 || length > 150;
  } catch {
    try {
      const getRes = await fetch(url, { method: "GET", redirect: "follow" });
      if (!getRes.ok) return false;
      const contentType = String(getRes.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("image")) return false;
      const ab = await getRes.arrayBuffer();
      return ab.byteLength > 150;
    } catch {
      return false;
    }
  }
}

async function resolveLogoUrl(website) {
  const candidates = getLogoCandidates(website);
  for (const candidate of candidates) {
    const valid = await isValidImage(candidate);
    if (valid) return candidate;
  }
  return "";
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key).");
    process.exit(1);
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await sb
    .from(args.table)
    .select("ein,org_name,website,logo_url")
    .limit(args.limit);

  if (error) {
    console.error("Failed to load nonprofits:", error.message);
    process.exit(1);
  }

  let enriched = 0;
  let skipped = 0;
  let missed = 0;
  let failed = 0;

  async function updateLogoRecord(ein, payload) {
    const full = await sb.from(args.table).update(payload).eq("ein", ein);
    if (!full.error) return { ok: true };

    // Fallback for tables that only have logo_url.
    const minimal = await sb.from(args.table).update({ logo_url: payload.logo_url || null }).eq("ein", ein);
    if (!minimal.error) return { ok: true };
    return { ok: false, error: minimal.error || full.error };
  }

  for (const row of data || []) {
    const ein = String(row.ein || "").trim();
    const orgName = String(row.org_name || "").trim() || ein || "Unknown";
    const existing = String(row.logo_url || "").trim();
    const website = String(row.website || "").trim();

    if (!args.force && existing) {
      skipped += 1;
      continue;
    }
    if (!website) {
      skipped += 1;
      continue;
    }

    const logoUrl = await resolveLogoUrl(website);
    if (!logoUrl) {
      missed += 1;
      console.log(`[MISS] ${orgName} (${ein})`);
      if (!args.dryRun && ein) {
        await updateLogoRecord(ein, {
          logo_url: null,
          logo_source: "unresolved",
          logo_status: "missing",
          last_checked_at: new Date().toISOString(),
        });
      }
      await sleep(WAIT_MS);
      continue;
    }

    if (args.dryRun) {
      enriched += 1;
      console.log(`[DRY] ${orgName} -> ${logoUrl}`);
      await sleep(WAIT_MS);
      continue;
    }

    const updateResult = await updateLogoRecord(ein, {
      logo_url: logoUrl,
      logo_source: "domain_discovery",
      logo_status: "resolved",
      last_checked_at: new Date().toISOString(),
    });
    if (!updateResult.ok) {
      failed += 1;
      console.log(`[FAIL] ${orgName} (${ein}) -> ${updateResult.error.message}`);
    } else {
      enriched += 1;
      console.log(`[OK] ${orgName} (${ein})`);
    }
    await sleep(WAIT_MS);
  }

  console.log("\nLogo enrichment finished.");
  console.log(`Enriched: ${enriched}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Missed: ${missed}`);
  console.log(`Failed: ${failed}`);
}

run().catch((e) => {
  console.error("Unhandled enrichment error:", e);
  process.exit(1);
});
