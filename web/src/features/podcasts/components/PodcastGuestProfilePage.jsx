"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { getSupabaseClient } from "@/lib/supabase/client";
import { FALLBACK_EPISODES, FALLBACK_GUESTS, getPodcastGuestProfile, listPodcastEpisodesByGuest, resolveEpisodeWatchUrl } from "@/features/podcasts/api/podcastApi";
import "@/features/podcasts/styles/podcasts.css";

export default function PodcastGuestProfilePage({ slug }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const fallbackGuest = FALLBACK_GUESTS.find((g) => g.slug === slug) || FALLBACK_GUESTS[0] || null;
  const [guest, setGuest] = useState(fallbackGuest);
  const [episodes, setEpisodes] = useState(FALLBACK_EPISODES.slice(0, 3));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const row = await getPodcastGuestProfile(supabase, slug);
      if (!row || cancelled) return;
      setGuest(row);
      const linked = await listPodcastEpisodesByGuest(supabase, row.id);
      if (!cancelled) setEpisodes(linked);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, supabase]);

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
          <Link className="btnSoft" href="/podcasts/guests">Back to Guests</Link>
          <article className="podcastGuestProfile">
            <div className="podcastGuestAvatar podcastGuestAvatar--large">
              {guest?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={guest.avatar_url} alt="" loading="lazy" />
              ) : (
                <span>{String(guest?.name || "G").slice(0, 1)}</span>
              )}
            </div>
            <div>
              <h1>{guest?.name || "Guest"}</h1>
              <p>{guest?.title || "Guest"}</p>
              <p>{guest?.bio || "Biography coming soon."}</p>
              {guest?.website_url ? (
                <a className="btnSoft" href={guest.website_url} target="_blank" rel="noopener noreferrer">Visit website</a>
              ) : null}
            </div>
          </article>
        </section>

        <section className="podcastSection">
          <h2 className="podcastSectionTitle">Episodes Appeared On</h2>
          <div className="podcastEpisodeGrid">
            {episodes.length ? episodes.map((ep) => (
              <article key={ep.id || ep.video_id} className="podcastEpisodeCard">
                <h3>{ep.title}</h3>
                <p>{ep.summary || "Episode details are available on YouTube."}</p>
                <a className="btnSoft" href={resolveEpisodeWatchUrl(ep)} target="_blank" rel="noopener noreferrer">Watch Episode</a>
              </article>
            )) : <p className="podcastMuted">Episode links are being prepared.</p>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
