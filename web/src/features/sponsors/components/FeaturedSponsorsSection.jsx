"use client";

import FeaturedSponsorCard from "@/features/sponsors/components/FeaturedSponsorCard";

export default function FeaturedSponsorsSection({
  sponsors = [],
  favoritesEnabled = false,
  favoriteKeySet = new Set(),
  onToggleFavorite,
  onRequestSignIn,
}) {
  return (
    <section className="card sponsorSection sponsorFeaturedSection">
      <div className="sponsorSectionHead">
        <h3>Platform sponsors</h3>
        <span className="sponsorFeaturedValuePill">App sponsor roster</span>
      </div>
      <p className="sponsorSectionLead">
        Curated sponsor spotlights with custom brand visuals, designed to honor each partner identity while staying mission-aligned.
      </p>
      <div className="sponsorFeaturedShowcase">
        {sponsors.map((sponsor) => (
          <FeaturedSponsorCard
            key={sponsor.id}
            sponsor={sponsor}
            favoritesEnabled={favoritesEnabled}
            isFavorite={favoriteKeySet.has(`sponsor:${String(sponsor.slug || sponsor.id || "").trim().toLowerCase()}`)}
            onToggleFavorite={onToggleFavorite}
            onRequestSignIn={onRequestSignIn}
          />
        ))}
      </div>
    </section>
  );
}

