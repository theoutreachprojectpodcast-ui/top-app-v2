"use client";

import { useMemo, useState } from "react";
import SponsorApplicationForm from "@/features/sponsors/components/SponsorApplicationForm";
import SponsorTierComparison from "@/features/sponsors/components/SponsorTierComparison";
import SponsorTimeline from "@/features/sponsors/components/SponsorTimeline";
import { SPONSOR_TIERS, formatUsd, getTierById } from "@/features/sponsors/data/sponsorTiers";

export default function BecomeASponsorPage({ supabase, selectedTierId: selectedTierIdProp, onSelectTier }) {
  const [selectedTierIdLocal, setSelectedTierIdLocal] = useState(SPONSOR_TIERS[0].id);
  const [applicationOpen, setApplicationOpen] = useState(false);
  const selectedTierId = selectedTierIdProp || selectedTierIdLocal;
  const setSelectedTierId = onSelectTier || setSelectedTierIdLocal;
  const selectedTier = useMemo(() => getTierById(selectedTierId), [selectedTierId]);

  return (
    <div className="sponsorPage">
      <section className="card cardHero sponsorHero">
        <p className="introTagline">Become a Sponsor</p>
        <h2>Fuel Mission-First Support for Veterans and First Responders</h2>
        <p>Choose a tier, confirm fit, and activate sponsor visibility across website, podcast, YouTube, and digital announcements.</p>
        <div className="row wrap">
          <button className="btnPrimary" type="button" onClick={() => setApplicationOpen(true)}>
            Apply as Sponsor
          </button>
          <p className="sponsorSelectionHint">
            Current selection: <strong>{selectedTier.name}</strong> - {formatUsd(selectedTier.amount)}
          </p>
        </div>
      </section>

      <section className="card sponsorSection">
        <h3>Sponsorship Overview</h3>
        <p className="sponsorSectionLead">Clear channel placement, mission alignment, and structured activation support.</p>
        <div className="sponsorPlacementGrid">
          <div className="resultCard">
            <strong>Website + Digital Experience</strong>
            <p>Featured sponsor cards, partner callouts, and rotating mission placements.</p>
          </div>
          <div className="resultCard">
            <strong>Podcast + YouTube Channels</strong>
            <p>Episode acknowledgements, spotlight mentions, and description callouts.</p>
          </div>
          <div className="resultCard">
            <strong>Community + Social Promotion</strong>
            <p>Digital announcements and social amplification aligned to sponsor goals.</p>
          </div>
        </div>
      </section>

      <SponsorTierComparison selectedTierId={selectedTierId} onSelectTier={setSelectedTierId} />

      <section className="card sponsorSection">
        <h3>Benefits and Placement Logic</h3>
        <p className="sponsorSectionLead">Higher tiers increase placement frequency, channel depth, and sponsor prominence.</p>
        <div className="sponsorPlacementGrid">
          <div className="resultCard">
            <strong>Support Sponsor Family</strong>
            <p>Focused website visibility and lighter social/content acknowledgements for entry-level participation.</p>
          </div>
          <div className="resultCard">
            <strong>Integrated Sponsorship Family</strong>
            <p>Cross-channel placement packages with elevated website, podcast, YouTube, and announcement integration.</p>
          </div>
          <div className="resultCard">
            <strong>Mission Sponsor Priority</strong>
            <p>Highest tier visibility with premium featured placement opportunities across the entire ecosystem.</p>
          </div>
        </div>
      </section>

      <SponsorTimeline />

      {applicationOpen ? (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="sponsor-app-title" onClick={() => setApplicationOpen(false)}>
          <div className="modalCard sponsorApplyModal" onClick={(e) => e.stopPropagation()}>
            <div className="sponsorApplyModalHead">
              <h3 id="sponsor-app-title">Sponsor application</h3>
              <button className="btnSoft sponsorModalClose" type="button" onClick={() => setApplicationOpen(false)}>
                Close
              </button>
            </div>
            <SponsorApplicationForm
              supabase={supabase}
              selectedTierId={selectedTierId}
              onSelectTier={setSelectedTierId}
              variant="modal"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
