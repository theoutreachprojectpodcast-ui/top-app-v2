"use client";

import Link from "next/link";
import FeaturedSponsorsSection from "@/features/sponsors/components/FeaturedSponsorsSection";

function ChannelChip({ icon, label }) {
  return (
    <div className="sponsorChannelChip">
      <span className="sponsorChannelChipIcon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export default function SponsorsLandingPage({ sponsors = [] }) {
  return (
    <div className="sponsorPage sponsorLanding">
      <section className="card cardHero sponsorHero sponsorHero--compact">
        <p className="introTagline">Partners</p>
        <h2>Partner with a trusted community platform</h2>
        <p className="sponsorHeroBlurb">
          Join mission-aligned brands, businesses, and organizations supporting trusted resources, storytelling, and community impact.
        </p>
        <div className="row wrap">
          <Link className="btnPrimary" href="/sponsors/options">
            Explore sponsorship options
          </Link>
          <Link className="btnSoft" href="/sponsors/apply">
            Become a sponsor
          </Link>
        </div>
      </section>

      <section className="card sponsorSection">
        <h3>Why sponsor</h3>
        <p className="sponsorSectionLead">Visible, values-driven placement—not a wall of ads.</p>
        <div className="sponsorChannelRow">
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20" /></svg>} label="Website" />
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" /></svg>} label="Podcast" />
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

      <FeaturedSponsorsSection sponsors={sponsors} />

      <section className="card sponsorCtaBand">
        <div>
          <h3>Ready to explore tiers?</h3>
          <p className="sponsorSectionLead">Compare packages, then apply when you are ready.</p>
        </div>
        <div className="row wrap">
          <Link className="btnSoft" href="/sponsors/options">Explore Sponsorship Options</Link>
          <Link className="btnPrimary" href="/sponsors/apply">Become a Sponsor</Link>
        </div>
      </section>
    </div>
  );
}

