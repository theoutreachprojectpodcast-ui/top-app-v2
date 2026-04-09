"use client";

import { useEffect, useState } from "react";
import { listSponsorsCatalog, mapSponsorsToCardModels } from "@/features/sponsors/api/sponsorCatalogApi";
import SponsorAdminEditorSection from "@/features/sponsors/components/SponsorAdminEditorSection";
import SponsorAdminReviewSection from "@/features/sponsors/components/SponsorAdminReviewSection";
import SponsorsLandingPage from "@/features/sponsors/components/SponsorsLandingPage";

export default function SponsorHub({ supabase }) {
  const [sponsors, setSponsors] = useState([]);

  async function loadSponsors() {
    const rows = await listSponsorsCatalog(supabase);
    setSponsors(rows);
  }

  useEffect(() => {
    loadSponsors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  return (
    <div className="sponsorPage">
      <SponsorsLandingPage sponsors={mapSponsorsToCardModels(sponsors)} />
      <hr className="sponsorAdminDivider" aria-hidden="true" />
      <SponsorAdminEditorSection supabase={supabase} sponsors={sponsors} onSaved={loadSponsors} />
      <SponsorAdminReviewSection supabase={supabase} />
    </div>
  );
}

