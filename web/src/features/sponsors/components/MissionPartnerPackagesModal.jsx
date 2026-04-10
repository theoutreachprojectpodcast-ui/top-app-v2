"use client";

import { useEffect, useState } from "react";
import SponsorTierComparison from "@/features/sponsors/components/SponsorTierComparison";
import { MISSION_PARTNER_TIERS, SPONSOR_TIERS } from "@/features/sponsors/data/sponsorTiers";

const OVERVIEW_AREAS = [
  {
    title: "Website and discovery",
    summary: "Mission partner presence where supporters look for trusted nonprofits and resources.",
    details: [
      "Structured sponsor and partner modules across the main Outreach Project experience.",
      "Category-aware placements that respect audience intent and trust.",
      "Editorial review for fit, compliance, and clarity before anything goes live.",
    ],
  },
  {
    title: "Long-form media (ecosystem)",
    summary: "Where appropriate, coordinated mentions can extend into podcast and YouTube programming.",
    details: [
      "Mission partner packages may include ecosystem-level media mentions when inventory allows.",
      "Dedicated podcast-only sponsor packages are sold separately on the Podcast hub.",
      "Placement sequencing is coordinated so partners get clarity, not noise.",
    ],
  },
  {
    title: "Community and social",
    summary: "Announcement-ready support for launches, milestones, and mission beats.",
    details: [
      "Social and digital acknowledgements scaled to tier level.",
      "Campaign timing reviewed with your team during onboarding.",
      "Higher tiers unlock more frequent and prominent promotion opportunities.",
    ],
  },
];

const BENEFIT_AREAS = [
  {
    title: "Why mission partners",
    summary: "Sponsorship is built for alignment, not clutter.",
    details: [
      "Transparent tiering with clear placements and benefits.",
      "A single onboarding path for the main Outreach Project sponsor program.",
      "Stewardship checkpoints so partners know what shipped and what is next.",
    ],
  },
  {
    title: "Podcast sponsors (separate program)",
    summary: "Episode-first packages with podcast-native branding.",
    details: [
      "Community Sponsor, Impact Sponsor, and Foundational tiers live only on the Podcast page.",
      "They do not appear in this mission partner workflow.",
      "Visit the Podcast hub to review podcast-specific placements.",
    ],
  },
  {
    title: "Fit and review",
    summary: "Every partnership is confirmed before activation.",
    details: [
      "Brand and mission fit review for all tiers.",
      "Asset collection with practical specs.",
      "Packages are application + review; invoicing and activation are coordinated after approval (no fake checkout in this flow).",
    ],
  },
];

export default function MissionPartnerPackagesModal({ open, onClose, onRequestApply, initialTierId }) {
  const [selectedTierId, setSelectedTierId] = useState(SPONSOR_TIERS[0]?.id);

  useEffect(() => {
    if (!open) return;
    if (initialTierId && MISSION_PARTNER_TIERS.some((t) => t.id === initialTierId)) {
      setSelectedTierId(initialTierId);
    }
  }, [open, initialTierId]);

  if (!open) return null;

  return (
    <div
      className="modalOverlay missionPartnerPackagesOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mission-partner-packages-title"
      onClick={onClose}
    >
      <div className="modalCard missionPartnerPackagesModal" onClick={(e) => e.stopPropagation()}>
        <div className="missionPartnerPackagesModal__head">
          <div>
            <h3 id="mission-partner-packages-title">Mission partner packages</h3>
            <p className="missionPartnerPackagesModal__sub">
              Compare Supporting Partner, Growth Partner, and Strategic Partner. Apply opens in a guided modal so you stay in the main app. These are mission partner packages (application + review). Account-level Support / Pro / Sponsor Membership is billed separately through onboarding when Stripe is enabled.
            </p>
          </div>
          <button type="button" className="btnSoft missionPartnerPackagesModal__close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="missionPartnerPackagesModal__body">
          <section className="card sponsorSection sponsorSection--modalInset">
            <h4 className="missionPartnerPackagesModal__sectionTitle">Program overview</h4>
            <p className="sponsorSectionLead">Scan the channels first, then open any block for detail.</p>
            <div className="sponsorExpandableGrid">
              {OVERVIEW_AREAS.map((area) => (
                <details className="sponsorDetailCard" key={area.title}>
                  <summary>{area.title}</summary>
                  <p>{area.summary}</p>
                  <ul className="sponsorBulletList">
                    {area.details.map((item) => (
                      <li key={`${area.title}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          <SponsorTierComparison
            tiers={MISSION_PARTNER_TIERS}
            selectedTierId={selectedTierId}
            onSelectTier={setSelectedTierId}
            title="Mission partner tiers"
            lead="Supporting Partner, Growth Partner, and Strategic Partner — select a package, then apply."
            familyTitle="Choose your package"
            familyDescription="Annual-style packages designed for sustained visibility across The Outreach Project digital ecosystem."
            compareHref="/sponsors?packages=1"
          />

          <section className="card sponsorSection sponsorSection--modalInset">
            <h4 className="missionPartnerPackagesModal__sectionTitle">Benefits and placement logic</h4>
            <p className="sponsorSectionLead">Summary on the surface, detail on expand.</p>
            <div className="sponsorExpandableGrid">
              {BENEFIT_AREAS.map((area) => (
                <details className="sponsorDetailCard" key={area.title}>
                  <summary>{area.title}</summary>
                  <p>{area.summary}</p>
                  <ul className="sponsorBulletList">
                    {area.details.map((item) => (
                      <li key={`${area.title}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          <div className="missionPartnerPackagesModal__foot row wrap">
            <button className="btnSoft" type="button" onClick={onClose}>
              Not now
            </button>
            <button className="btnPrimary" type="button" onClick={() => onRequestApply(selectedTierId)}>
              Become a mission partner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
