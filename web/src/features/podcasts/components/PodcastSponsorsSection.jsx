"use client";

import FeaturedSponsorCard from "@/features/sponsors/components/FeaturedSponsorCard";
import { mapSponsorsToCardModels } from "@/features/sponsors/api/sponsorCatalogApi";

export default function PodcastSponsorsSection({ sponsors = [] }) {
  const models = mapSponsorsToCardModels(sponsors);
  if (!models.length) return null;
  return (
    <section className="card sponsorSection sponsorFeaturedSection podcastSection podcastSponsorsSectionWrap">
      <div className="sponsorSectionHead">
        <h3>Podcast sponsors</h3>
        <span className="sponsorFeaturedValuePill">Supporting the show</span>
      </div>
      <p className="sponsorSectionLead">
        Organizations backing The Outreach Project podcast. Same spotlight cards as the main sponsor hub — podcast roster only.
      </p>
      <div className="sponsorFeaturedShowcase podcastSponsorsCardGrid">
        {models.map((s) => (
          <FeaturedSponsorCard key={s.id} sponsor={s} />
        ))}
      </div>
    </section>
  );
}
