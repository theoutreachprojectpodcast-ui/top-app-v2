/**
 * Platform-wide nonprofit + Trusted Resources naming verifier.
 *
 * Scans:
 * - nonprofits_search_app_v1
 * - proven_allies (Trusted Resources catalog)
 *
 * Output per flagged row:
 * - source, id/ein
 * - current title
 * - recommended title
 * - issue codes
 * - confidence
 * - autoFixSafe
 *
 * Optional:
 * - VERIFY_WEB=1   -> fetch official website title for confidence support
 * - APPLY_TRUSTED=1 -> updates proven_allies.display_name when safe
 *
 * Usage:
 *   node scripts/verify-platform-organization-names.mjs
 *   VERIFY_WEB=1 node scripts/verify-platform-organization-names.mjs
 *   APPLY_TRUSTED=1 VERIFY_WEB=1 node scripts/verify-platform-organization-names.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const namesUrl = pathToFileURL(path.join(__dirname, "../src/lib/entityDisplayName.js")).href;
const { auditEntityTitleSlot, resolveCanonicalOrganizationName } = await import(namesUrl);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const VERIFY_WEB = process.env.VERIFY_WEB === "1";
const APPLY_TRUSTED = process.env.APPLY_TRUSTED === "1";
const MAX_SCAN = Number(process.env.MAX_SCAN || 2500);
const FAIL_ON_CRITICAL = process.env.FAIL_ON_CRITICAL === "1";

if (!SUPABASE_URL || !(SERVICE_KEY || ANON_KEY)) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL and a Supabase key (service or anon).");
  process.exit(1);
}

const key = SERVICE_KEY || ANON_KEY;
const sb = createClient(SUPABASE_URL, key, { auth: { persistSession: false } });

function normalizeEin(ein = "") {
  let d = String(ein || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length > 9) d = d.slice(-9);
  return d.padStart(9, "0");
}

function firstText(...vals) {
  for (const v of vals) {
    const t = String(v ?? "").trim();
    if (t) return t;
  }
  return "";
}

function confidence(issueCodes = [], hasWebsiteHint = false, webAgrees = false) {
  let c = 0.5;
  if (issueCodes.includes("generic_label_title")) c += 0.2;
  if (issueCodes.includes("ein_in_title") || issueCodes.includes("status_as_title")) c += 0.2;
  if (hasWebsiteHint) c += 0.05;
  if (webAgrees) c += 0.15;
  return Math.max(0, Math.min(1, c));
}

function websiteTitleUrl(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

async function fetchWebsiteTitle(url) {
  if (!VERIFY_WEB || !url) return "";
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return "";
    const html = await res.text();
    const m = html.match(/<title[^>]*>([^<]{1,220})<\/title>/i);
    return String(m?.[1] || "").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

async function scanDirectory() {
  const out = [];
  let from = 0;
  const batch = 1000;
  let scanned = 0;
  for (;;) {
    const { data, error } = await sb
      .from("nonprofits_search_app_v1")
      .select("*")
      .range(from, from + batch - 1);
    if (error) throw error;
    if (!data?.length) break;
    scanned += data.length;
    if (scanned % 1000 === 0) {
      console.log(`[directory] scanned ${scanned}`);
    }
    for (const r of data) {
      const current = firstText(r.display_name, r.org_name, r.organization_name, r.legal_name, r.name, r.NAME);
      const recommended = resolveCanonicalOrganizationName({
        candidateNames: [
          r.display_name,
          r.verified_name,
          r.approved_name,
          r.org_name,
          r.organization_name,
          r.NAME,
          r.name,
          r.legal_name,
        ],
        websiteUrl: r.website,
        emptyFallback: "Organization",
      });
      const issues = auditEntityTitleSlot(current, { slot: "card" });
      const needsChange = recommended && current && recommended !== current;
      if (issues.length || needsChange) {
        const webTitle = await fetchWebsiteTitle(websiteTitleUrl(r.website));
        const webAgrees = !!(webTitle && recommended && webTitle.toLowerCase().includes(recommended.toLowerCase()));
        const issueCodes = [...new Set(issues.map((i) => i.code))];
        out.push({
          source: "nonprofit_directory",
          ein: normalizeEin(r.ein),
          id: normalizeEin(r.ein) || String(r.ein || ""),
          currentTitle: current,
          recommendedTitle: recommended,
          issueCodes,
          website: r.website || "",
          websiteTitle: webTitle || null,
          confidence: confidence(issueCodes, !!r.website, webAgrees),
          autoFixSafe: issueCodes.length > 0 && !issueCodes.includes("all_caps"),
          manualReview: issueCodes.includes("all_caps"),
        });
      }
    }
    if (scanned >= MAX_SCAN) break;
    from += batch;
  }
  return out;
}

async function scanTrusted() {
  const out = [];
  const { data, error } = await sb
    .from("proven_allies")
    .select("id,ein,display_name,website_url,listing_status")
    .limit(5000);
  if (error && String(error.code || "") !== "PGRST205") throw error;

  let trustedRows = (data || []).slice(0, MAX_SCAN);
  let sourceTable = "proven_allies";
  if (error && String(error.code || "") === "PGRST205") {
    const fallback = await sb
      .from("nonprofit_profiles")
      .select("*")
      .limit(5000);
    if (fallback.error) throw fallback.error;
    sourceTable = "nonprofit_profiles";
    trustedRows = (fallback.data || [])
      .filter((r) => {
        const approved = String(r.proven_ally_status || "").toLowerCase() === "approved";
        return r.is_trusted === true || r.is_proven_ally === true || approved;
      })
      .map((r) => ({
        id: r.id || r.ein || r.organization_name || r.display_name_override || crypto.randomUUID(),
        ein: r.ein,
        display_name: firstText(r.display_name_override, r.organization_name, r.legal_name),
        website_url: r.website,
        listing_status: "active",
      }))
      .slice(0, MAX_SCAN);
  }

  for (const r of trustedRows) {
    const current = String(r.display_name || "").trim();
    const recommended = resolveCanonicalOrganizationName({
      candidateNames: [r.display_name],
      websiteUrl: r.website_url,
      emptyFallback: "Organization",
    });
    const issues = auditEntityTitleSlot(current, { slot: "card" });
    const needsChange = recommended && current && recommended !== current;
    if (issues.length || needsChange) {
      const webTitle = await fetchWebsiteTitle(websiteTitleUrl(r.website_url));
      const webAgrees = !!(webTitle && recommended && webTitle.toLowerCase().includes(recommended.toLowerCase()));
      const issueCodes = [...new Set(issues.map((i) => i.code))];
      const autoFixSafe =
        !!recommended &&
        recommended !== "Organization" &&
        !issueCodes.includes("all_caps");
      out.push({
        source: sourceTable === "proven_allies" ? "trusted_resources_catalog" : "trusted_resources_profiles_fallback",
        id: String(r.id),
        ein: normalizeEin(r.ein),
        currentTitle: current,
        recommendedTitle: recommended,
        issueCodes,
        website: r.website_url || "",
        websiteTitle: webTitle || null,
        confidence: confidence(issueCodes, !!r.website_url, webAgrees),
        autoFixSafe,
        manualReview: !autoFixSafe,
      });
    }
  }

  if (APPLY_TRUSTED) {
    if (!SERVICE_KEY) {
      console.warn("APPLY_TRUSTED skipped: SUPABASE_SERVICE_ROLE_KEY is not set.");
      return out;
    }
    if (sourceTable !== "proven_allies") {
      console.warn("APPLY_TRUSTED skipped: proven_allies table is not available in this project.");
      return out;
    }
    const safe = out.filter((x) => x.autoFixSafe && x.recommendedTitle && x.recommendedTitle !== x.currentTitle);
    for (const row of safe) {
      const { error: upErr } = await sb.from("proven_allies").update({ display_name: row.recommendedTitle }).eq("id", row.id);
      if (upErr) {
        row.manualReview = true;
        row.applyError = upErr.message;
      } else {
        row.applied = true;
      }
    }
  }

  return out;
}

const [directoryFindings, trustedFindings] = await Promise.all([scanDirectory(), scanTrusted()]);
const findings = [...directoryFindings, ...trustedFindings];

const counts = findings.reduce((acc, f) => {
  acc.total += 1;
  acc[f.source] = (acc[f.source] || 0) + 1;
  if (f.autoFixSafe) acc.autoFixSafe += 1;
  if (f.manualReview) acc.manualReview += 1;
  return acc;
}, { total: 0, autoFixSafe: 0, manualReview: 0 });

console.log("Platform naming verification report");
console.log(JSON.stringify(counts, null, 2));

const preview = findings.slice(0, 120).map((f) => ({
  source: f.source,
  id: f.id,
  ein: f.ein,
  current: f.currentTitle,
  recommended: f.recommendedTitle,
  issues: f.issueCodes.join(","),
  confidence: Number(f.confidence).toFixed(2),
  autoFixSafe: f.autoFixSafe,
  applied: !!f.applied,
}));
console.table(preview);

if (findings.length) {
  const worst = findings.filter((f) => f.issueCodes.includes("generic_label_title") || f.issueCodes.includes("ein_in_title"));
  if (worst.length) {
    console.log(`Critical title issues found: ${worst.length}`);
    if (FAIL_ON_CRITICAL) process.exitCode = 1;
  }
}
