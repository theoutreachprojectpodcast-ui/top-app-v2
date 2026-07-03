"use client";

import Link from "next/link";
import SponsorsTieredSections from "@/features/sponsors/components/SponsorsTieredSections";

function ChannelChip({ icon, label }) {
  return (
    <div className="sponsorChannelChip">
      <span className="sponsorChannelChipIcon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export default function SponsorsLandingPage({ sponsorCatalogRows = [], onOpenBecomeSponsor }) {
  const openBecomeSponsor = typeof onOpenBecomeSponsor === "function" ? onOpenBecomeSponsor : () => {};

  return (
    <div className="sponsorPage sponsorLanding">
      <section className="card cardHero sponsorHero sponsorHero--compact">
        <p className="introTagline">Platform sponsors</p>
        <h2>Partner with The Outreach Project</h2>
        <p className="sponsorHeroBlurb">
          Browse the partner roster below. When you are ready, use Become a sponsor at the bottom of this page to
          compare all six packages and submit one application.
        </p>
      </section>

      <div className="sponsorRosterStack">
        <section className="card sponsorSection sponsorFeaturedSection">
          <div className="sponsorSectionHead">
            <h3>Sponsor roster</h3>
            <span className="sponsorFeaturedValuePill">App sponsor roster</span>
          </div>
          <p className="sponsorSectionLead">
            Partners by tier — open a card for the full profile and verified links.
          </p>
        </section>
        <SponsorsTieredSections sponsorRecords={sponsorCatalogRows} />
      </div>

      <section className="card sponsorSection">
        <h3>Why sponsor</h3>
        <p className="sponsorSectionLead">Mission partner placements emphasize trust and clarity—not a wall of ads.</p>
        <div className="sponsorChannelRow">
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20" /></svg>} label="Website" />
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="10" rx="2" /><path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" /></svg>} label="YouTube ecosystem" />
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM13 21a3 3 0 100-6 3 3 0 000 6z" /></svg>} label="Social and digital" />
        </div>
        <details className="sponsorReveal">
          <summary>Podcast sponsors (included in Become a sponsor)</summary>
          <ul className="sponsorBulletList">
            <li>Community, Impact, and Foundational podcast packages are available in the same application flow.</li>
            <li>
              <Link href="/podcasts?sponsor=1">Open the Podcast hub →</Link>
            </li>
          </ul>
        </details>
      </section>

      <section className="card sponsorCtaBand sponsorCtaBand--become">
        <div>
          <h3>Ready to partner?</h3>
          <p className="sponsorSectionLead">
            Compare mission partner and podcast packages, then apply in one guided modal.
          </p>
        </div>
        <button className="btnPrimary" type="button" onClick={() => openBecomeSponsor()}>
          Become a sponsor
        </button>
      </section>
    </div>
  );
}
