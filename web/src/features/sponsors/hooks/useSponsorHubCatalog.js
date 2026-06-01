"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStaticAppSponsorCatalogRows } from "@/features/sponsors/api/sponsorCatalogApi";
import { loadAppSponsorHubCatalog } from "@/features/sponsors/api/sponsorHubCatalog";

/**
 * Sponsor hub (`/sponsors`) roster only — not Trusted Resources.
 * Ignores stale async responses if `supabase` identity changes or a second load starts.
 */
export function useSponsorHubCatalog(supabase) {
  const [sponsorCatalogRows, setSponsorCatalogRows] = useState(() => getStaticAppSponsorCatalogRows());
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const gen = (loadGeneration.current += 1);
    try {
      const rows = await loadAppSponsorHubCatalog(supabase);
      if (gen !== loadGeneration.current) return;
      setSponsorCatalogRows(rows?.length ? rows : getStaticAppSponsorCatalogRows());
    } catch {
      if (gen !== loadGeneration.current) return;
      setSponsorCatalogRows(getStaticAppSponsorCatalogRows());
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  return useMemo(
    () => ({
      sponsorCatalogRows,
      reloadSponsorCatalog: load,
    }),
    [sponsorCatalogRows, load],
  );
}
