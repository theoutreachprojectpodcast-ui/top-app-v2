"use client";

import GuestCard from "@/features/podcasts/components/GuestCard";

/**
 * @param {{ guests: object[] }} props
 */
export default function PodcastGuestsPage({ guests = [] }) {
  return (
    <div className="podcastScope">
      <section className="card cardHero podcastPageHero podcastPageHero--compact">
        <div className="communityHeroTop podcastPageHero__top">
          <div className="communityHeroTitles">
            <p className="introTagline">Podcast</p>
            <h2>Guest profiles</h2>
          </div>
        </div>
        <p className="communityHeroText podcastPageHero__lead">
          Guests featured on published episodes of The Outreach Project Podcast.
        </p>
      </section>
      <section className="podcastSection">
        <div className="podcastGuestGrid">
          {guests.map((guest) => (
            <GuestCard key={guest.slug || guest.id} guest={guest} />
          ))}
        </div>
      </section>
    </div>
  );
}
