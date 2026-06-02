"use client";

import { useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import PodcastApplyGuestForm from "@/features/podcasts/components/PodcastApplyGuestForm";

export default function PodcastApplyPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  return (
    <div className="podcastScope">
      <section className="card cardHero podcastPageHero podcastPageHero--compact">
        <div className="communityHeroTop podcastPageHero__top">
          <div className="communityHeroTitles">
            <p className="introTagline">Podcast</p>
            <h2>Apply to be on the show</h2>
          </div>
        </div>
        <p className="communityHeroText podcastPageHero__lead">
          Share your story and pitch. The production team reviews every application.
        </p>
      </section>
      <PodcastApplyGuestForm supabase={supabase} />
    </div>
  );
}
