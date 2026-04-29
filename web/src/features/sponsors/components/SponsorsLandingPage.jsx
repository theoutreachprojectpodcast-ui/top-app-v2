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

export default function SponsorsLandingPage({ sponsors = [], onOpenMissionPackages, onOpenMissionApply }) {
  const openPackages = typeof onOpenMissionPackages === "function" ? onOpenMissionPackages : () => {};
  const openApply = typeof onOpenMissionApply === "function" ? onOpenMissionApply : () => {};

  return (
    <div className="sponsorPage sponsorLanding">
      <section className="card cardHero sponsorHero sponsorHero--compact">
        <p className="introTagline">Platform sponsors</p>
        <h2>Partner with The Outreach Project</h2>
        <p className="sponsorHeroBlurb">
          Meet current partners below, then explore Supporting, Growth, and Strategic mission packages in a guided popup. Podcast-only sponsor tiers open from the Podcast hub.
        </p>
        <div className="row wrap">
          <button className="btnPrimary" type="button" onClick={() => openPackages()}>
            Explore mission partner packages
          </button>
          <button className="btnSoft" type="button" onClick={() => openApply()}>
            Become a mission partner
          </button>
        </div>
      </section>

      <FeaturedSponsorsSection sponsors={sponsors} />

      <section className="card sponsorSection">
        <h3>Why sponsor</h3>
        <p className="sponsorSectionLead">Mission partner placements emphasize trust and clarity—not a wall of ads.</p>
        <div className="sponsorChannelRow">
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20" /></svg>} label="Website" />
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="10" rx="2" /><path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" /></svg>} label="YouTube ecosystem" />
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM13 21a3 3 0 100-6 3 3 0 000 6z" /></svg>} label="Social and digital" />
        </div>
        <details className="sponsorReveal">
          <summary>Podcast sponsors (separate program)</summary>
          <ul className="sponsorBulletList">
            <li>Community, Impact, and Foundational podcast packages are offered from the Podcast page.</li>
            <li>
              <Link href="/podcasts?sponsor=1">Open podcast sponsor flow →</Link>
            </li>
          </ul>
        </details>
      </section>

      <section className="card sponsorCtaBand">
        <div>
          <h3>Mission partner next steps</h3>
          <p className="sponsorSectionLead">Review packages in detail, then apply when your team is ready.</p>
        </div>
        <div className="row wrap">
          <button className="btnSoft" type="button" onClick={() => openPackages()}>
            View mission partner options
          </button>
          <button className="btnPrimary" type="button" onClick={() => openApply()}>
            Apply to become a mission partner
          </button>
        </div>
      </section>
    </div>
  );
}
