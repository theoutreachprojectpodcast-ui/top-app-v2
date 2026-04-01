"use client";

import { FEATURED_SPONSORS } from "@/features/sponsors/data/featuredSponsors";

function ChannelChip({ icon, label }) {
  return (
    <div className="sponsorChannelChip">
      <span className="sponsorChannelChipIcon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export default function SponsorsLandingPage({ onExploreOptions }) {
  return (
    <div className="sponsorPage sponsorLanding">
      <section className="card cardHero sponsorHero sponsorHero--compact">
        <p className="introTagline">Partners</p>
        <h2>Stand with veterans & first responders</h2>
        <p className="sponsorHeroBlurb">
          Join brands backing trusted resources, podcast storytelling, and digital support for those who serve.
        </p>
        <div className="row wrap">
          <button className="btnPrimary" type="button" onClick={onExploreOptions}>
            Explore sponsorship options
          </button>
        </div>
      </section>

      <section className="card sponsorSection">
        <h3>Featured sponsors</h3>
        <p className="sponsorSectionLead">Mission-aligned partners helping expand reach and credibility.</p>
        <div className="sponsorFeaturedGrid">
          {FEATURED_SPONSORS.map((s) => (
            <div key={s.id} className="sponsorFeaturedCard">
              <div className="sponsorFeaturedMark" aria-hidden="true">{s.initials}</div>
              <div className="sponsorFeaturedBody">
                <strong>{s.name}</strong>
                <span>{s.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card sponsorSection">
        <h3>Why sponsor</h3>
        <p className="sponsorSectionLead">Visible, values-driven placement—not a wall of ads.</p>
        <div className="sponsorChannelRow">
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20" /></svg>} label="Website" />
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4a6 6 0 016 6v4a2 2 0 01-4 0v-4a2 2 0 10-4 0v10a2 2 0 01-4 0V10a6 6 0 016-6z" /></svg>} label="Podcast" />
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="10" rx="2" /><path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" /></svg>} label="YouTube" />
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM13 21a3 3 0 100-6 3 3 0 000 6z" /></svg>} label="Social & digital" />
        </div>
        <details className="sponsorReveal">
          <summary>More about placements</summary>
          <ul className="sponsorBulletList">
            <li>Sponsor cards and mission partner callouts on the digital experience</li>
            <li>Episode acknowledgements and description placements</li>
            <li>Announcements aligned to your brand and audience goals</li>
          </ul>
        </details>
      </section>

      <section className="card sponsorCtaBand">
        <div>
          <h3>Ready to explore tiers?</h3>
          <p className="sponsorSectionLead">Compare packages, then apply when you are ready.</p>
        </div>
        <button className="btnPrimary" type="button" onClick={onExploreOptions}>
          Become a sponsor
        </button>
      </section>
    </div>
  );
}

