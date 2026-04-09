/**
 * Joins public directory + optional enrichment onto Trusted Resources catalog rows
 * so card titles never depend on a single sparse `proven_allies.display_name` field.
 *
 * Table name `proven_allies` is the Trusted Resources catalog in Supabase; this module
 * is the canonical bridge to `nonprofits_search_app_v1` + `nonprofit_directory_enrichment`.
 */

const DIRECTORY_TABLE = "nonprofits_search_app_v1";
const ENRICHMENT_TABLE = "nonprofit_directory_enrichment";

function runQuery(factory) {
  try {
    return factory();
  } catch (error) {
    return { data: null, error };
  }
}

export function normalizeEinKey(value) {
  let d = String(value ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length > 9) d = d.slice(-9);
  return d.padStart(9, "0");
}

function stripLeadingZeros(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/^0+/, "") || "0";
}

function indexOrgRow(map, org) {
  const raw = String(org?.ein ?? "").trim();
  const n = normalizeEinKey(org?.ein);
  const unpadded = stripLeadingZeros(org?.ein);
  if (raw) map.set(raw, org);
  if (n) map.set(n, org);
  if (unpadded) map.set(unpadded, org);
  const dashed = n.length === 9 ? `${n.slice(0, 2)}-${n.slice(2)}` : "";
  if (dashed) map.set(dashed, org);
}

function lookupOrg(map, ein) {
  const raw = String(ein ?? "").trim();
  const n = normalizeEinKey(ein);
  const unpadded = stripLeadingZeros(ein);
  const dashed = n.length === 9 ? `${n.slice(0, 2)}-${n.slice(2)}` : "";
  return (
    map.get(raw) ||
    map.get(n) ||
    map.get(unpadded) ||
    map.get(dashed) ||
    {}
  );
}

function indexEnrichmentRow(map, row) {
  const n = normalizeEinKey(row?.ein);
  if (n.length === 9) map.set(n, row);
}

function lookupEnrichment(map, ein) {
  const n = normalizeEinKey(ein);
  return n.length === 9 ? map.get(n) || {} : {};
}

function weakOrgName(name) {
  const t = String(name ?? "").trim();
  return !t || /^unknown organization$/i.test(t);
}

function normalizeLogoUrl(url = "") {
  return String(url || "").trim();
}

function isWeakLogoUrl(url = "") {
  const u = normalizeLogoUrl(url).toLowerCase();
  if (!u) return true;
  // Typical favicon endpoints are too small for trusted resource brand bubbles.
  if (u.includes("google.com/s2/favicons")) return true;
  if (u.includes("/favicon")) return true;
  if (/[?&]sz=\d{1,3}\b/.test(u)) return true;
  if (/[?&](w|width|h|height)=\d{1,3}\b/.test(u)) return true;
  return false;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {object[]} rows — trusted catalog rows (mapProvenAlliesDbRowToTrustedRow shape)
 */
export async function attachDirectoryAndEnrichmentToTrustedRows(supabase, rows = []) {
  if (!supabase || !rows.length) return rows;

  const einSet = new Set();
  for (const r of rows) {
    const n = normalizeEinKey(r?.ein);
    if (n.length === 9) einSet.add(n);
  }
  const eins = [...einSet];
  if (!eins.length) return rows;

  const einQueryList = [];
  for (const e of eins) {
    einQueryList.push(e, `${e.slice(0, 2)}-${e.slice(2)}`);
  }

  const dirResult = await runQuery(() =>
    supabase
      .from(DIRECTORY_TABLE)
      .select(
        "ein,org_name,name,city,state,ntee_code,website,logo_url,verification_tier,verification_source,serves_veterans,serves_first_responders"
      )
      .in("ein", einQueryList)
  );

  const dirRows = dirResult?.error ? [] : dirResult.data || [];
  const orgByKey = new Map();
  for (const org of dirRows) {
    indexOrgRow(orgByKey, org);
  }

  const enResult = await runQuery(() =>
    supabase
      .from(ENRICHMENT_TABLE)
      .select("ein,display_name_on_site,canonical_display_name,website_verified_name,logo_url,short_description,headline")
      .in("ein", eins)
  );
  const enRows = enResult?.error ? [] : enResult.data || [];
  const enrichByEin = new Map();
  for (const er of enRows) {
    indexEnrichmentRow(enrichByEin, er);
  }

  return rows.map((row) => {
    const org = lookupOrg(orgByKey, row.ein);
    const enrich = lookupEnrichment(enrichByEin, row.ein);
    const dirName = String(org.org_name || org.name || "").trim();
    const canonicalName = String(enrich.canonical_display_name || "").trim();
    const siteName = String(enrich.display_name_on_site || "").trim();

    const next = { ...row };
    const rawOrg = { ...(next.raw?.org || {}), ...org };
    next.raw = { ...(next.raw || {}), org: rawOrg };

    if (siteName) {
      next.display_name_on_site = siteName;
      next.displayNameOnSite = siteName;
    }
    if (canonicalName) {
      next.canonical_display_name = canonicalName;
      next.canonicalDisplayName = canonicalName;
    }
    if (enrich.website_verified_name) {
      next.website_verified_name = String(enrich.website_verified_name).trim();
      next.websiteVerifiedName = next.website_verified_name;
    }
    if (enrich.short_description) {
      next.short_description = next.short_description || String(enrich.short_description).trim();
    }
    if (enrich.headline) {
      next.headline = next.headline || String(enrich.headline).trim();
    }

    if (weakOrgName(next.orgName) && canonicalName) {
      next.orgName = canonicalName;
    }
    if (weakOrgName(next.orgName) && dirName) {
      next.orgName = dirName;
    }
    if (weakOrgName(next.orgName) && siteName) {
      next.orgName = siteName;
    }
    if (weakOrgName(next.raw?.profile?.organization_name) && dirName) {
      next.raw.profile = { ...next.raw.profile, organization_name: dirName, display_name_override: dirName };
    }

    if (!String(next.city || "").trim() && org.city) next.city = String(org.city).trim();
    if (!String(next.state || "").trim() && org.state) next.state = String(org.state).trim();
    if (!String(next.nteeCode || next.ntee_code || "").trim() && org.ntee_code) {
      next.ntee_code = String(org.ntee_code).trim();
      next.nteeCode = next.ntee_code;
    }
    if (!String(next.website || "").trim() && org.website) {
      next.website = org.website;
      if (next.raw?.profile) next.raw.profile = { ...next.raw.profile, website: org.website };
    }
    const currentLogo = normalizeLogoUrl(next.logoUrl);
    const enrichLogo = normalizeLogoUrl(enrich.logo_url);
    const orgLogo = normalizeLogoUrl(org.logo_url);
    const preferredLogo = !isWeakLogoUrl(enrichLogo)
      ? enrichLogo
      : !isWeakLogoUrl(orgLogo)
        ? orgLogo
        : orgLogo || enrichLogo || currentLogo;

    if (!currentLogo || isWeakLogoUrl(currentLogo)) {
      if (preferredLogo && preferredLogo !== currentLogo) {
        next.logoUrl = preferredLogo;
        if (next.raw?.profile) next.raw.profile = { ...next.raw.profile, logo_url: preferredLogo };
      }
    } else if (!next.raw?.profile?.logo_url) {
      if (next.raw?.profile) next.raw.profile = { ...next.raw.profile, logo_url: currentLogo };
    }

    const resolvedTitle = String(next.orgName || "").trim();
    if (resolvedTitle && next.raw?.profile) {
      const po = String(next.raw.profile.organization_name || "").trim();
      if (!po || weakOrgName(po)) {
        next.raw.profile = {
          ...next.raw.profile,
          organization_name: resolvedTitle,
          display_name_override: resolvedTitle,
        };
      }
    }

    return next;
  });
}
