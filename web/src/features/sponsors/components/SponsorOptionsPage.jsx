"use client";

import Link from "next/link";
import { useState } from "react";
import SponsorTierComparison from "@/features/sponsors/components/SponsorTierComparison";
import { SPONSOR_TIERS } from "@/features/sponsors/data/sponsorTiers";

const OVERVIEW_AREAS = [
  {
    title: "Website + Digital Experience",
    summary: "Brand placement in high-intent surfaces where partners discover trusted nonprofits and services.",
    details: [
      "Featured sponsor cards across high-visibility website placements.",
      "Mission partner mentions in relevant discovery surfaces.",
      "Category-aligned placement opportunities to support qualified exposure.",
    ],
  },
  {
    title: "Podcast + YouTube Channels",
    summary: "Sponsor visibility through long-form storytelling and recurring media programming.",
    details: [
      "Episode-level sponsor acknowledgements where format fit is strong.",
      "Description and show-note placements tied to campaigns.",
      "Structured mention cadence based on tier and campaign timing.",
    ],
  },
  {
    title: "Community + Social Promotion",
    summary: "Broader social and announcement support designed for awareness and trust.",
    details: [
      "Launch and partner announcements across TOP social surfaces.",
      "Campaign-ready sponsor callouts aligned to audience interest.",
      "Optional activation concepts for milestone launches or impact moments.",
    ],
  },
];

const BENEFIT_AREAS = [
  {
    title: "Support Sponsor Family",
    summary: "Best for early partnership activation with strong visibility in core placements.",
    details: [
      "Reliable exposure in website and announcement channels.",
      "Lower-lift activation that still creates clear brand presence.",
      "Clear upgrade path into integrated cross-channel packages.",
    ],
  },
  {
    title: "Integrated Sponsorship Family",
    summary: "Built for partners seeking multi-channel continuity and broader campaign presence.",
    details: [
      "Cross-channel integration spanning website, media, and social touchpoints.",
      "Higher placement frequency with stronger tier-based priority.",
      "More room for tailored messaging and campaign alignment.",
    ],
  },
  {
    title: "Placement Logic",
    summary: "Placement depth scales with tier level, fit, and campaign readiness.",
    details: [
      "Higher tiers unlock more frequent and premium placements.",
      "Placement sequencing is coordinated to protect audience quality.",
      "All partner campaigns are reviewed for trust and brand fit.",
    ],
  },
];

export default function SponsorOptionsPage() {
  const [selectedTierId, setSelectedTierId] = useState(SPONSOR_TIERS[0].id);
  return (
    <div className="sponsorPage">
      <section className="card cardHero sponsorHero">
        <p className="introTagline">Sponsorship Options</p>
        <h2>Compare sponsorship packages</h2>
        <p>Review placements, benefits, and channel visibility. Expand sections for deeper detail, then continue to application.</p>
      </section>

      <section className="card sponsorSection">
        <h3>Sponsorship Overview</h3>
        <p className="sponsorSectionLead">Channel-by-channel details so sponsors understand exactly what they get.</p>
        <div className="sponsorExpandableGrid">
          {OVERVIEW_AREAS.map((area) => (
            <details className="sponsorDetailCard" key={area.title}>
              <summary>{area.title}</summary>
              <p>{area.summary}</p>
              <ul className="sponsorBulletList">
                {area.details.map((item) => <li key={`${area.title}-${item}`}>{item}</li>)}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <SponsorTierComparison selectedTierId={selectedTierId} onSelectTier={setSelectedTierId} />

      <section className="card sponsorSection">
        <h3>Benefits and Placement Logic</h3>
        <p className="sponsorSectionLead">Quick summary first, with denser operational details on expand.</p>
        <div className="sponsorExpandableGrid">
          {BENEFIT_AREAS.map((area) => (
            <details className="sponsorDetailCard" key={area.title}>
              <summary>{area.title}</summary>
              <p>{area.summary}</p>
              <ul className="sponsorBulletList">
                {area.details.map((item) => <li key={`${area.title}-${item}`}>{item}</li>)}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <section className="card sponsorCtaBand">
        <div>
          <h3>Ready to apply?</h3>
          <p className="sponsorSectionLead">Continue to the sponsor application workflow with your selected tier.</p>
        </div>
        <Link className="btnPrimary" href="/sponsors/apply">Become a Sponsor</Link>
      </section>
    </div>
  );
}
