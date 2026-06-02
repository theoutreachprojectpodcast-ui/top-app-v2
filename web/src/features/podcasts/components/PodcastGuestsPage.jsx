"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { FALLBACK_GUESTS, listPodcastGuests } from "@/features/podcasts/api/podcastApi";
import GuestCard from "@/features/podcasts/components/GuestCard";

export default function PodcastGuestsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [guests, setGuests] = useState(FALLBACK_GUESTS);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await listPodcastGuests(supabase);
      if (!cancelled) setGuests(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

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
          Explore guests featured across The Outreach Project Podcast.
        </p>
      </section>
      <section className="podcastSection">
        <div className="podcastGuestGrid">
          {guests.map((guest) => (
            <GuestCard key={guest.id} guest={guest} />
          ))}
        </div>
      </section>
    </div>
  );
}
