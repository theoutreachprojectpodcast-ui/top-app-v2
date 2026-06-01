/**
 * `/sponsors` hub catalog — `sponsors_catalog` + static seed only.
 * Keep Trusted Resources (`/trusted`, `trusted_resources`, registry) out of this module tree.
 */

import { getStaticAppSponsorCatalogRows, listAppSponsorsCatalog } from "@/features/sponsors/api/sponsorCatalogApi";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient | null | undefined} supabase
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function loadAppSponsorHubCatalog(supabase) {
  const rows = await listAppSponsorsCatalog(supabase);
  const safe = Array.isArray(rows) && rows.length ? rows : getStaticAppSponsorCatalogRows();
  return safe;
}
