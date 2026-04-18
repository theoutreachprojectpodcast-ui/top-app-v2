import { TRUSTED_PAGE_SIZE } from "@/lib/constants";
import { mapTrustedRow } from "@/lib/supabase/mappers";
import { queryTrustedOrgsByEin } from "@/lib/supabase/queries";

async function runQuery(factory) {
  try {
    return await factory();
  } catch (error) {
    return { data: null, error };
  }
}

function normalizeEin(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.padStart(9, "0");
}

function stripLeadingZeros(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/^0+/, "") || "0";
}

function normalizeDomain(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const full = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(full).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export async function fetchTrustedResources(supabase) {
  // Use broad profile fetch to avoid schema-specific filter failures.
  const profileResult = await runQuery(() => supabase.from("nonprofit_profiles").select("*").limit(1000));
  if (profileResult.error) throw profileResult.error;

  const featuredTiers = new Set(["featured", "featured_partner", "trusted", "trusted_partner", "tier_3"]);
  const profiles = (profileResult.data || []).filter((p) => {
    const tier = String(p?.verification_tier || "").trim().toLowerCase();
    const approved = String(p?.proven_ally_status || "").trim().toLowerCase() === "approved";
    return !!p?.ein && (p?.is_trusted === true || p?.is_proven_ally === true || approved || featuredTiers.has(tier));
  });
  if (!profiles.length) return [];
  const einKeys = new Set();
  for (const p of profiles) {
    const raw = String(p?.ein ?? "").trim();
    const normalized = normalizeEin(p?.ein);
    const unpadded = stripLeadingZeros(p?.ein);
    if (raw) einKeys.add(raw);
    if (normalized) einKeys.add(normalized);
    if (unpadded) einKeys.add(unpadded);
  }
  const eins = [...einKeys];

  const orgResult = await runQuery(() => queryTrustedOrgsByEin(supabase, eins));
  const orgRowsPrimary = orgResult?.error ? [] : (orgResult.data || []);
  const directoryResult = await runQuery(() =>
    supabase
      .from("nonprofits_search_app_v1")
      .select("ein,org_name,name,city,state,ntee_code,website,logo_url,verification_tier,verification_source,serves_veterans,serves_first_responders")
      .in("ein", eins)
  );
  const orgRowsDirectory = directoryResult?.error ? [] : (directoryResult.data || []);
  const orgRows = [...orgRowsPrimary, ...orgRowsDirectory];

  const orgMap = new Map();
  for (const org of orgRows) {
    const rawKey = String(org?.ein ?? "").trim();
    const normalizedKey = normalizeEin(org?.ein);
    if (rawKey) orgMap.set(rawKey, org);
    if (normalizedKey) orgMap.set(normalizedKey, org);
  }

  const rows = profiles
    .map((p) => {
      const rawKey = String(p?.ein ?? "").trim();
      const normalizedKey = normalizeEin(p?.ein);
      const unpaddedKey = stripLeadingZeros(p?.ein);
      const org = orgMap.get(rawKey) || orgMap.get(normalizedKey) || orgMap.get(unpaddedKey) || {};
      return mapTrustedRow(p, org);
    })
    .filter((row) => row.orgName)
    .sort((a, b) => a.orgName.localeCompare(b.orgName, undefined, { sensitivity: "base" }));

  // If many profile rows still don't resolve rich org fields, backfill from directory snapshot.
  const unresolved = rows.filter((r) => !r.city || !r.state || !r.nteeCode || !r.orgName || r.orgName === "Unknown Organization");
  if (unresolved.length) {
    const directorySnapshot = await runQuery(() =>
      supabase
        .from("nonprofits_search_app_v1")
        .select("ein,org_name,name,city,state,ntee_code,website,logo_url,verification_tier,verification_source,serves_veterans,serves_first_responders")
        .limit(20000)
    );
    const snapshotRows = directorySnapshot?.error ? [] : (directorySnapshot.data || []);
    const byEin = new Map();
    const byDomain = new Map();
    for (const org of snapshotRows) {
      const rawKey = String(org?.ein ?? "").trim();
      const normalizedKey = normalizeEin(org?.ein);
      const unpaddedKey = stripLeadingZeros(org?.ein);
      const domain = normalizeDomain(org?.website);
      if (rawKey) byEin.set(rawKey, org);
      if (normalizedKey) byEin.set(normalizedKey, org);
      if (unpaddedKey) byEin.set(unpaddedKey, org);
      if (domain) byDomain.set(domain, org);
    }

    return rows.map((row) => {
      const rawKey = String(row?.ein ?? "").trim();
      const normalizedKey = normalizeEin(row?.ein);
      const unpaddedKey = stripLeadingZeros(row?.ein);
      const domain = normalizeDomain(row?.website);
      const org = byEin.get(rawKey) || byEin.get(normalizedKey) || byEin.get(unpaddedKey) || byDomain.get(domain) || {};
      return mapTrustedRow(row?.raw?.profile || row, org);
    });
  }
  return rows;
}

export function getTrustedSlice(rows, offset = 0) {
  return rows.slice(offset, offset + TRUSTED_PAGE_SIZE);
}

