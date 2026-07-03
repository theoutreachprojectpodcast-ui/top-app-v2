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
  const openApply = typeof onOpenBecomeSponsor === "function" ? onOpenBecomeSponsor : () => {};

  return (
    <div className="sponsorPage sponsorLanding">
      <section className="card cardHero sponsorHero sponsorHero--compact">
        <p className="introTagline">Platform sponsors</p>
        <h2>Partner with The Outreach Project</h2>
        <p className="sponsorHeroBlurb">
          Browse mission partner, foundational, impact, and community sponsors below. When you are ready, use{" "}
          <strong>Become a sponsor</strong> to compare main-platform packages and submit one application. Podcast
          packages are handled separately on the <Link href="/podcasts">Podcast hub</Link>.
        </p>
        <div className="row wrap sponsorHero__actions">
          <button className="btnPrimary" type="button" onClick={() => openApply()}>
            Become a sponsor
          </button>
        </div>
      </section>

      <div className="sponsorRosterStack">
        <SponsorsTieredSections sponsorRecords={sponsorCatalogRows} />
      </div>

      <div className="sponsorLandingClosing">
        <section className="card sponsorSection sponsorSection--why">
          <h3>Why sponsor</h3>
          <p className="sponsorSectionLead">Mission-aligned placements emphasize trust and clarity—not a wall of ads.</p>
          <div className="sponsorChannelRow">
            <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20" /></svg>} label="Website" />
            <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="10" rx="2" /><path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" /></svg>} label="YouTube ecosystem" />
            <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM13 21a3 3 0 100-6 3 3 0 000 6z" /></svg>} label="Social and digital" />
          </div>
          <p className="sponsorSectionLead sponsorSectionLead--flush">
            Podcast sponsor packages (Community, Impact, and Foundational for the show) live on the{" "}
            <Link href="/podcasts">Podcast hub</Link> — not on this page.
          </p>
        </section>

        <section className="card sponsorCtaBand sponsorCtaBand--become">
          <div>
            <h3>Ready to partner?</h3>
            <p className="sponsorSectionLead">
              Open the application to compare mission partner, foundational, and impact packages and apply in one guided
              flow.
            </p>
          </div>
          <button className="btnPrimary" type="button" onClick={() => openApply()}>
            Become a sponsor
          </button>
        </section>
      </div>
    </div>
  );
}
