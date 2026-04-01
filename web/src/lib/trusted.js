import { TRUSTED_PAGE_SIZE } from "@/lib/constants";

export async function fetchTrustedMerged(supabase) {
  const { data: profiles, error: pErr } = await supabase
    .from("nonprofit_profiles")
    .select("ein,display_name_override,website,instagram_url,facebook_url,youtube_url,x_url,linkedin_url,is_trusted")
    .eq("is_trusted", true)
    .limit(500);

  if (pErr) throw pErr;

  const eins = (profiles || []).map((r) => r.ein).filter(Boolean);
  const { data: orgs } = await supabase.from("nonprofits").select("ein,name,city,state,ntee_code").in("ein", eins);
  const orgMap = new Map((orgs || []).map((o) => [String(o.ein), o]));

  return (profiles || [])
    .map((p) => {
      const o = orgMap.get(String(p.ein)) || {};
      return {
        ein: p.ein,
        org_name: p.display_name_override || o.name || "Trusted Resource",
        city: o.city || "",
        state: o.state || "",
        ntee_code: o.ntee_code || "",
        website: p.website || "",
        instagram_url: p.instagram_url || "",
        facebook_url: p.facebook_url || "",
        youtube_url: p.youtube_url || "",
        x_url: p.x_url || "",
        linkedin_url: p.linkedin_url || "",
        is_trusted: true,
      };
    })
    .sort((a, b) => a.org_name.localeCompare(b.org_name));
}

export function sliceTrustedRows(rows, offset) {
  return rows.slice(offset, offset + TRUSTED_PAGE_SIZE);
}
