"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SponsorApplicationForm from "@/features/sponsors/components/SponsorApplicationForm";
import SponsorTierComparison from "@/features/sponsors/components/SponsorTierComparison";
import SponsorTimeline from "@/features/sponsors/components/SponsorTimeline";
import { SPONSOR_TIERS, formatUsd, getTierById } from "@/features/sponsors/data/sponsorTiers";
export default function BecomeASponsorPage({ supabase, selectedTierId: selectedTierIdProp, onSelectTier }) {
  const [selectedTierIdLocal, setSelectedTierIdLocal] = useState(SPONSOR_TIERS[0].id);
  const selectedTierId = selectedTierIdProp || selectedTierIdLocal;
  const setSelectedTierId = onSelectTier || setSelectedTierIdLocal;
  const selectedTier = useMemo(() => getTierById(selectedTierId), [selectedTierId]);

  return (
    <div className="sponsorPage">
      <section className="card cardHero sponsorHero">
        <p className="introTagline">Become a Sponsor</p>
        <h2>Sponsor application and onboarding</h2>
        <p>Submit your sponsorship application, select your tier, and move through review, confirmation, assets, and launch.</p>
        <div className="row wrap">
          <p className="sponsorSelectionHint">
            Current selection: <strong>{selectedTier.name}</strong> - {formatUsd(selectedTier.amount)}
          </p>
          <Link className="btnSoft" href="/sponsors/options">Review options first</Link>
        </div>
      </section>

      <SponsorTimeline />
      <SponsorTierComparison selectedTierId={selectedTierId} onSelectTier={setSelectedTierId} />
      <SponsorApplicationForm
        supabase={supabase}
        selectedTierId={selectedTierId}
        onSelectTier={setSelectedTierId}
      />

    </div>
  );
}
