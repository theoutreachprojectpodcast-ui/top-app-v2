"use client";

import Link from "next/link";
import SponsorTierComparison from "@/features/sponsors/components/SponsorTierComparison";
import SponsorsTieredSections from "@/features/sponsors/components/SponsorsTieredSections";
import {
  FOUNDATIONAL_SPONSOR_TIERS,
  IMPACT_SPONSOR_TIERS,
  MISSION_PARTNER_TIERS,
} from "@/features/sponsors/data/sponsorTiers";
import { SPONSOR_DISPLAY_GROUP_SECTION_LEAD } from "@/features/sponsors/domain/sponsorDisplayGroups";

function ChannelChip({ icon, label }) {
  return (
    <div className="sponsorChannelChip">
      <span className="sponsorChannelChipIcon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export default function SponsorsLandingPage({
  sponsorCatalogRows = [],
  onOpenBecomeSponsor,
  onOpenBecomeSponsorWithTier,
}) {
  const openApply = typeof onOpenBecomeSponsor === "function" ? onOpenBecomeSponsor : () => {};
  const openApplyWithTier =
    typeof onOpenBecomeSponsorWithTier === "function" ? onOpenBecomeSponsorWithTier : () => openApply();

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

      <section className="card sponsorSection sponsorApplySection" id="apply-sponsor">
        <div className="sponsorSectionHead">
          <h3>Apply to be a sponsor</h3>
          <span className="sponsorFeaturedValuePill">Main platform</span>
        </div>
        <p className="sponsorSectionLead">
          Compare mission partner, foundational, and impact packages below, then start one application for the main
          Outreach Project experience. Community and podcast sponsor programs are not part of this flow.
        </p>

        <div className="row wrap sponsorApplySection__actions sponsorApplySection__actions--primary">
          <button className="btnPrimary" type="button" onClick={() => openApply()}>
            Become a sponsor
          </button>
        </div>

        <SponsorTierComparison
          tiers={MISSION_PARTNER_TIERS}
          selectedTierId=""
          onSelectTier={openApplyWithTier}
          title="Mission partner sponsors"
          lead={SPONSOR_DISPLAY_GROUP_SECTION_LEAD.mission_partner}
          familyTitle="Mission partner packages"
          familyDescription="Supporting, Growth, and Strategic Partner tiers for premier ecosystem visibility."
          compareHref="/sponsors?apply=1"
        />

        <SponsorTierComparison
          tiers={FOUNDATIONAL_SPONSOR_TIERS}
          selectedTierId=""
          onSelectTier={openApplyWithTier}
          title="Foundational sponsors"
          lead={SPONSOR_DISPLAY_GROUP_SECTION_LEAD.foundational}
          familyTitle="Foundational sponsor program"
          familyDescription="Core partners anchoring trust and readiness across the platform."
          compareHref="/sponsors?apply=1"
        />

        <SponsorTierComparison
          tiers={IMPACT_SPONSOR_TIERS}
          selectedTierId=""
          onSelectTier={openApplyWithTier}
          title="Impact sponsors"
          lead={SPONSOR_DISPLAY_GROUP_SECTION_LEAD.impact}
          familyTitle="Impact sponsor program"
          familyDescription="Regional and program sponsors extending reach into communities and verticals."
          compareHref="/sponsors?apply=1"
        />

        <p className="sponsorSectionLead sponsorApplySection__footNote">
          Ready to apply? Use <strong>Become a sponsor</strong> above or compare tiers first, then select a package.
        </p>
      </section>

      <section className="card sponsorSection">
        <h3>Why sponsor</h3>
        <p className="sponsorSectionLead">Mission-aligned placements emphasize trust and clarity—not a wall of ads.</p>
        <div className="sponsorChannelRow">
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20" /></svg>} label="Website" />
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="10" rx="2" /><path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" /></svg>} label="YouTube ecosystem" />
          <ChannelChip icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM13 21a3 3 0 100-6 3 3 0 000 6z" /></svg>} label="Social and digital" />
        </div>
        <p className="sponsorSectionLead">
          Podcast sponsor packages (Community, Impact, and Foundational for the show) live on the{" "}
          <Link href="/podcasts">Podcast hub</Link> — not on this page.
        </p>
      </section>

      <section className="card sponsorCtaBand sponsorCtaBand--become">
        <div>
          <h3>Ready to partner?</h3>
          <p className="sponsorSectionLead">
            Compare mission partner, foundational, and impact packages, then apply in one guided modal.
          </p>
        </div>
        <button className="btnPrimary" type="button" onClick={() => openApply()}>
          Become a sponsor
        </button>
      </section>
    </div>
  );
}
