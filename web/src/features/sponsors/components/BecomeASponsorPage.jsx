"use client";

import { useMemo, useState } from "react";
import SponsorApplicationForm from "@/features/sponsors/components/SponsorApplicationForm";
import SponsorTierComparison from "@/features/sponsors/components/SponsorTierComparison";
import { SPONSOR_TIERS, formatUsd, getTierById } from "@/features/sponsors/data/sponsorTiers";

export default function BecomeASponsorPage({ supabase }) {
  const [selectedTierId, setSelectedTierId] = useState(SPONSOR_TIERS[0].id);
  const selectedTier = useMemo(() => getTierById(selectedTierId), [selectedTierId]);

  return (
    <div className="sponsorPage">
      <section className="card cardHero sponsorHero">
        <p className="introTagline">Become a Sponsor</p>
        <h2>Fuel Mission-First Support for Veterans and First Responders</h2>
        <p>
          Sponsor The Outreach Project to help expand trusted resources, strengthen digital access, and
          accelerate community visibility across web, podcast, YouTube, and ecosystem announcements.
        </p>
        <div className="row wrap">
          <button className="btnPrimary" type="button" onClick={() => {
            const formEl = typeof document !== "undefined" ? document.getElementById("sponsor-application-form") : null;
            if (formEl) formEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }}>
            Apply as Sponsor
          </button>
          <p className="sponsorSelectionHint">
            Current selection: <strong>{selectedTier.name}</strong> - {formatUsd(selectedTier.amount)}
          </p>
        </div>
      </section>

      <section className="card sponsorSection">
        <h3>Sponsorship Overview</h3>
        <p>
          Sponsorship supports a mission-driven ecosystem built to connect veterans, first responders, and supporters
          with trusted organizations and real-world help. Sponsor placements are structured across digital and media
          surfaces so partners can contribute meaningfully while receiving credible visibility.
        </p>
        <div className="sponsorPlacementGrid">
          <div className="resultCard">
            <strong>Website + Digital Experience</strong>
            <p>Featured sponsor cards, partner callouts, rotating placements, and highlighted mission visibility.</p>
          </div>
          <div className="resultCard">
            <strong>Podcast + YouTube Channels</strong>
            <p>Episode acknowledgements, sponsor spotlights, and partner mentions in content descriptions.</p>
          </div>
          <div className="resultCard">
            <strong>Community + Social Promotion</strong>
            <p>Digital announcements, social support, and ecosystem updates aligned to sponsor goals.</p>
          </div>
        </div>
      </section>

      <SponsorTierComparison selectedTierId={selectedTierId} onSelectTier={setSelectedTierId} />

      <section className="card sponsorSection">
        <h3>Benefits and Placement Logic</h3>
        <p>
          Higher tiers receive broader channel integration, more frequent mention opportunities, and stronger visual
          placement priority. The integrated sponsorship ladder is built for sponsors who want recurring mission-facing
          visibility across multiple channels.
        </p>
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

      <div id="sponsor-application-form">
        <SponsorApplicationForm supabase={supabase} selectedTierId={selectedTierId} onSelectTier={setSelectedTierId} />
      </div>

      <section className="card sponsorSection">
        <h3>What Happens Next</h3>
        <div className="sponsorFaqGrid">
          <div className="resultCard">
            <strong>Application Review</strong>
            <p>Our team reviews fit, placement priorities, and onboarding readiness for your selected tier.</p>
          </div>
          <div className="resultCard">
            <strong>Demo Payment Clarification</strong>
            <p>This flow uses demo states now. Live billing can be connected later without changing sponsor UX.</p>
          </div>
          <div className="resultCard">
            <strong>Onboarding + Activation</strong>
            <p>Approved sponsors move into asset intake, timeline alignment, and launch planning across channels.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
