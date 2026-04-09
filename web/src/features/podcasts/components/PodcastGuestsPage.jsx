"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getSupabaseClient } from "@/lib/supabase/client";
import { FALLBACK_GUESTS, listPodcastGuests } from "@/features/podcasts/api/podcastApi";
import GuestCard from "@/features/podcasts/components/GuestCard";
import "@/features/podcasts/styles/podcasts.css";

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

  const podcastLogoSrc =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_PODCAST_BRAND_LOGO_PATH) ||
    "/podcast-logo-transparent.png";

  return (
    <AppShell
      activeNav="home"
      shellClassName="appShell--podcast"
      brandSrc={podcastLogoSrc}
      brandAlt="The Outreach Project Podcast"
      brandClassName="podcastBrandLogo"
      showSiteFooter
      usePrimaryTopbarChrome
      useFooterDockChrome
      useTopAppStructure
      showThemeToggle={false}
    >
      <div className="podcastScope">
        <section className="podcastSection">
          <h2 className="podcastSectionTitle">Guest Profiles</h2>
          <p className="podcastSectionSubtitle">Explore guests featured across The Outreach Project Podcast.</p>
          <div className="podcastGuestGrid">
            {guests.map((guest) => <GuestCard key={guest.id} guest={guest} />)}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
