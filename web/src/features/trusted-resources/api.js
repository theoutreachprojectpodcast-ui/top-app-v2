import { TRUSTED_PAGE_SIZE } from "@/lib/constants";
import { mapTrustedRow } from "@/lib/supabase/mappers";
import { queryTrustedOrgsByEin, queryTrustedProfiles } from "@/lib/supabase/queries";

export async function fetchTrustedResources(supabase) {
  const profileResult = await queryTrustedProfiles(supabase, 500);
  if (profileResult.error) throw profileResult.error;

  const profiles = profileResult.data || [];
  const eins = profiles.map((p) => p.ein).filter(Boolean);
  if (!eins.length) return [];

  const orgResult = await queryTrustedOrgsByEin(supabase, eins);
  if (orgResult.error) throw orgResult.error;

  const orgMap = new Map((orgResult.data || []).map((o) => [String(o.ein), o]));
  return profiles
    .map((p) => mapTrustedRow(p, orgMap.get(String(p.ein)) || {}))
    .sort((a, b) => a.orgName.localeCompare(b.orgName, undefined, { sensitivity: "base" }));
}

export function getTrustedSlice(rows, offset = 0) {
  return rows.slice(offset, offset + TRUSTED_PAGE_SIZE);
}

