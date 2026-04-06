"use client";

import FeaturedSponsorCard from "@/features/sponsors/components/FeaturedSponsorCard";

export default function FeaturedSponsorsSection({ sponsors = [] }) {
  return (
    <section className="card sponsorSection sponsorFeaturedSection">
      <div className="sponsorSectionHead">
        <h3>Mission partners</h3>
        <span className="sponsorFeaturedValuePill">Current sponsors</span>
      </div>
      <p className="sponsorSectionLead">
        Curated sponsor spotlights with custom brand visuals, designed to honor each partner identity while staying mission-aligned.
      </p>
      <div className="sponsorFeaturedShowcase">
        {sponsors.map((sponsor) => (
          <FeaturedSponsorCard key={sponsor.id} sponsor={sponsor} />
        ))}
      </div>
    </section>
  );
}

