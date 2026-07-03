"use client";

import { useMemo } from "react";
import FeaturedSponsorCard from "@/features/sponsors/components/FeaturedSponsorCard";
import {
  SPONSOR_DISPLAY_GROUP_ORDER,
  SPONSOR_DISPLAY_GROUP_SECTION_LEAD,
  SPONSOR_DISPLAY_GROUP_SECTION_TITLE,
  groupSponsorsByDisplayTier,
} from "@/features/sponsors/domain/sponsorDisplayGroups";
import { getSponsorCardViewModel, normalizeSponsorRecord } from "@/features/sponsors/domain/sponsorViewModels";

/**
 * @param {object} props
 * @param {Record<string, unknown>[]} props.sponsorRecords raw or normalized catalog rows (preferred for tier inference)
 */
export default function SponsorsTieredSections({ sponsorRecords = [] }) {
  const sections = useMemo(() => {
    const normalized = (Array.isArray(sponsorRecords) ? sponsorRecords : []).map((r) => normalizeSponsorRecord(r));
    const grouped = groupSponsorsByDisplayTier(normalized);
    return SPONSOR_DISPLAY_GROUP_ORDER.map((key) => ({
      key,
      title: SPONSOR_DISPLAY_GROUP_SECTION_TITLE[key],
      lead: SPONSOR_DISPLAY_GROUP_SECTION_LEAD[key],
      cards: grouped[key].map((row) => getSponsorCardViewModel(row)),
    })).filter((s) => s.cards.length > 0);
  }, [sponsorRecords]);

  if (!sections.length) {
    return (
      <section className="card sponsorSection">
        <p className="sponsorSectionLead">
          Sponsor roster could not be grouped by tier. Try refreshing the page. If this persists, confirm Supabase
          sponsors_catalog rows use sponsor_display_group values: mission_partner, foundational, impact, or community.
        </p>
      </section>
    );
  }

  return (
    <>
      {sections.map(({ key, title, lead, cards }) => (
        <section key={key} className={`card sponsorSection sponsorTierSection sponsorTierSection--${key}`}>
          <div className="sponsorSectionHead">
            <h3>{title}</h3>
          </div>
          <p className="sponsorSectionLead">{lead}</p>
          <div className={`sponsorFeaturedShowcase sponsorFeaturedShowcase--tier-${key}`}>
            {cards.map((sponsor) => (
              <FeaturedSponsorCard key={sponsor.slug || sponsor.id} sponsor={sponsor} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
