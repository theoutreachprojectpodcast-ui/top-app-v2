"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { listPodcastSponsorsCatalog } from "@/features/podcasts/api/podcastSponsorsCatalog";
import {
  FALLBACK_EPISODES,
  fetchPodcastRecentBundle,
  humanizePodcastBundleError,
  listPodcastEpisodeGuests,
} from "@/features/podcasts/api/podcastApi";
import PodcastHero from "@/features/podcasts/components/PodcastHero";
import EpisodeCard from "@/features/podcasts/components/EpisodeCard";
import GuestCard from "@/features/podcasts/components/GuestCard";
import PodcastSponsorFlowModal from "@/features/podcasts/components/PodcastSponsorFlowModal";
import PodcastSectionHeader from "@/features/podcasts/components/PodcastSectionHeader";
import PodcastSponsorsSection from "@/features/podcasts/components/PodcastSponsorsSection";
import PodcastCTASection from "@/features/podcasts/components/PodcastCTASection";
import PodcastApplyGuestForm from "@/features/podcasts/components/PodcastApplyGuestForm";
import { PODCAST_LANDING_RECENT_EPISODE_COUNT } from "@/lib/podcast/podcastLandingCuratedEpisodes";

const FULL_EPISODES_SECTION_COUNT = PODCAST_LANDING_RECENT_EPISODE_COUNT;
const isDevBuild = typeof process !== "undefined" && process.env.NODE_ENV === "development";

export default function PodcastsLandingPage({
  initialEpisodes = [],
  initialFeaturedGuests = [],
  initialBundleMeta = {},
}) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [episodes, setEpisodes] = useState(() => {
    if (Array.isArray(initialEpisodes) && initialEpisodes.length) return initialEpisodes;
    return isDevBuild ? FALLBACK_EPISODES : [];
  });
  const [featuredVoices, setFeaturedVoices] = useState(
    Array.isArray(initialFeaturedGuests) && initialFeaturedGuests.length ? initialFeaturedGuests : []
  );
  const [podcastSponsors, setPodcastSponsors] = useState([]);
  const [upcomingGuests, setUpcomingGuests] = useState([]);
  const [podcastBandImageUrl, setPodcastBandImageUrl] = useState("");
  const [episodeGuests, setEpisodeGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bundleNote, setBundleNote] = useState("");
  const [episodeFetchError, setEpisodeFetchError] = useState(() => {
    if (Array.isArray(initialEpisodes) && initialEpisodes.length) return "";
    return humanizePodcastBundleError(initialBundleMeta?.error);
  });
  const [podcastSponsorBillingReady, setPodcastSponsorBillingReady] = useState(true);
  const [podcastSponsorBillingMissingEnv, setPodcastSponsorBillingMissingEnv] = useState([]);

  const [applyOpen, setApplyOpen] = useState(false);
  const [sponsorFlowOpen, setSponsorFlowOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("sponsor") === "1") {
      setSponsorFlowOpen(true);
    }
    if (searchParams.get("sponsor_checkout") === "success" || searchParams.get("sponsor_checkout") === "cancel") {
      setSponsorFlowOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bundle = await fetchPodcastRecentBundle();
      const [sp, eg, upcomingRes] = await Promise.all([
        listPodcastSponsorsCatalog(supabase),
        listPodcastEpisodeGuests(supabase),
        fetch("/api/podcasts/upcoming", { credentials: "include", cache: "no-store" }).then((r) => r.json().catch(() => ({}))),
      ]);
      if (cancelled) return;
      const nextEpisodes = Array.isArray(bundle.episodes) ? bundle.episodes : [];
      if (bundle.ok && nextEpisodes.length) {
        setEpisodeFetchError("");
        setEpisodes(nextEpisodes);
        if (Array.isArray(bundle.featuredGuests) && bundle.featuredGuests.length) {
          setFeaturedVoices(bundle.featuredGuests);
        }
      } else if (nextEpisodes.length) {
        setEpisodeFetchError("");
        setEpisodes(nextEpisodes);
        if (Array.isArray(bundle.featuredGuests) && bundle.featuredGuests.length) {
          setFeaturedVoices(bundle.featuredGuests);
        }
      } else {
        setEpisodes((prev) => (Array.isArray(prev) && prev.length ? prev : nextEpisodes));
        setEpisodeFetchError(
          humanizePodcastBundleError(bundle.error) || "Episodes could not be refreshed.",
        );
      }
      if (bundle?.degraded || initialBundleMeta?.degraded) {
        setBundleNote(
          "Fewer than five episodes in the curated strip matched the official playlist, or YouTube data was unavailable. Check API keys, playlist ID, and admin include/exclude rules."
        );
      } else {
        setBundleNote("");
      }
      setPodcastSponsors(Array.isArray(sp) ? sp : []);
      setEpisodeGuests(eg);
      const ug = Array.isArray(upcomingRes?.guests) ? upcomingRes.guests : [];
      setUpcomingGuests(
        ug.map((r) => ({
          id: r.id,
          slug: String(r.id || ""),
          name: r.name || "Guest",
          title: [String(r.role_title || "").trim(), String(r.organization || "").trim()].filter(Boolean).join(" · ") || "Upcoming guest",
          bio:
            [String(r.short_description || "").trim(), String(r.episode_topic || "").trim()].filter(Boolean).join(" — ") ||
            "Scheduled conversation — details will be announced soon.",
          avatar_url: String(r.profile_image_url || "").trim(),
          upcoming: true,
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, initialBundleMeta?.degraded]);

  useEffect(() => {
    const root = document.querySelector("main.topApp.appShell--podcastRoute");
    if (!root) return;
    if (podcastBandImageUrl) {
      root.style.setProperty("--podcast-band-image", `url("${podcastBandImageUrl}")`);
    } else {
      root.style.removeProperty("--podcast-band-image");
    }
  }, [podcastBandImageUrl]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/page-images?pageKey=podcasts&sectionKey=hero-band", { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        const first = Array.isArray(body?.rows) ? body.rows[0] : null;
        setPodcastBandImageUrl(String(first?.image_url || "").trim());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/billing/capabilities", { credentials: "include", cache: "no-store" })
      .then((res) => res.json().catch(() => ({})))
      .then((body) => {
        if (cancelled) return;
        const ready = !!body?.podcastSponsorCheckout;
        setPodcastSponsorBillingReady(ready);
        setPodcastSponsorBillingMissingEnv(Array.isArray(body?.podcastSponsorMissingEnv) ? body.podcastSponsorMissingEnv : []);
      })
      .catch(() => {
        if (!cancelled) {
          setPodcastSponsorBillingReady(false);
          setPodcastSponsorBillingMissingEnv([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = episodes.find((item) => item.is_featured) || episodes[0] || null;
  const lastTenFullEpisodes = episodes.slice(0, FULL_EPISODES_SECTION_COUNT);
  const guestsByEpisode = new Map();
  for (const link of episodeGuests) {
    const episodeId = String(link?.episode_id || "");
    const guest = link?.podcast_guests;
    if (!episodeId || !guest) continue;
    if (!guestsByEpisode.has(episodeId)) guestsByEpisode.set(episodeId, []);
    guestsByEpisode.get(episodeId).push(guest);
  }

  return (
    <div className="podcastScope">
        <PodcastHero featured={featured} onApply={() => setApplyOpen(true)} />

        <section className="podcastSection">
          <PodcastSectionHeader
            eyebrow="Featured guests"
            title="Voices shaping service communities"
            subtitle="Short pull-quotes from episode captions when available; otherwise curated public quotes or tight show-notes lines. Active voice cards: Admin → Podcasts."
          />
          {bundleNote ? <p className="podcastMuted">{bundleNote}</p> : null}
          <div className="podcastGuestGrid">
            {featuredVoices.slice(0, 4).map((guest) => (
              <GuestCard key={guest.id || guest.slug} guest={guest} variant="voiceStrip" />
            ))}
          </div>
          {!featuredVoices.length ? <p className="podcastMuted">Guest highlights will appear after the next successful sync.</p> : null}
        </section>

        <section className="podcastSection">
          <PodcastSectionHeader
            eyebrow="Episode library"
            title="Latest full episodes"
            subtitle="The ten most recent episodes from our official YouTube full-episodes playlist, with thumbnails synced from YouTube."
          />
          {episodeFetchError && !lastTenFullEpisodes.length ? (
            <p className="podcastMuted" role="alert">
              {episodeFetchError}
            </p>
          ) : null}
          {loading ? <p className="podcastMuted">Loading episodes…</p> : null}
          <div className="podcastEpisodeGrid">
            {lastTenFullEpisodes.map((episode) => (
              <EpisodeCard
                key={episode.id || episode.youtube_video_id}
                episode={episode}
                guests={guestsByEpisode.get(String(episode.id || "")) || []}
              />
            ))}
          </div>
          {!loading && !lastTenFullEpisodes.length ? (
            <p className="podcastMuted" role="status">
              {episodeFetchError
                ? "Episodes are temporarily unavailable. Please try again shortly."
                : "No full episodes matched the official filters yet. If this persists, verify the YouTube playlist and API configuration."}
            </p>
          ) : null}
        </section>

        <section className="podcastSection">
          <PodcastSectionHeader eyebrow="Coming Next" title="Upcoming Guests" subtitle="Who is scheduled next on the show." />
          <div className="podcastUpcomingGrid">
            {upcomingGuests.map((guest) => (
              <GuestCard key={`upcoming-${guest.id}`} guest={guest} variant="upcoming" />
            ))}
          </div>
          {!upcomingGuests.length ? (
            <div className="podcastLockCard">
              <strong>Upcoming guests coming soon</strong>
              <p>
                When the team schedules the next conversations, they will appear here. Nothing is wrong with your connection — we
                simply do not have public upcoming rows yet.
              </p>
            </div>
          ) : null}
        </section>

        <section className="podcastSection">
          <PodcastSectionHeader eyebrow="Guest Applications" title="Want to be on the show?" subtitle="Open the in-page application modal to apply." />
          <div className="row wrap">
            <button className="btnPrimary" type="button" onClick={() => setApplyOpen(true)}>
              Apply to Be on the Podcast
            </button>
          </div>
        </section>
        <section className="podcastSection podcastSponsorCtaBand">
          <PodcastSectionHeader
            eyebrow="Podcast sponsors"
            title="Sponsor the show"
            subtitle="Community, Impact, and Foundational packages. Open the flow to compare tiers, review full placements and benefits, and apply—without leaving the podcast experience."
          />
          <div className="row wrap">
            <button className="btnPrimary" type="button" onClick={() => setSponsorFlowOpen(true)}>
              Sponsor the show
            </button>
            <Link className="btnSoft" href="/sponsors?packages=1">
              Sponsor hub (main app)
            </Link>
          </div>
          {!podcastSponsorBillingReady ? (
            <p className="podcastMuted" role="status">
              Podcast sponsor checkout is not fully configured for this environment.
              {podcastSponsorBillingMissingEnv.length
                ? ` Missing: ${podcastSponsorBillingMissingEnv.join(", ")}.`
                : ""}
            </p>
          ) : null}
        </section>
        <PodcastSponsorsSection sponsors={podcastSponsors} />
        <PodcastCTASection onApply={() => setApplyOpen(true)} />
      </div>
      {applyOpen ? (
        <div
          className="modalOverlay podcastModalOverlay podcastApplyGuestOverlay podcastSponsorFlowOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="podcast-apply-guest-title"
          onClick={() => setApplyOpen(false)}
        >
          <div className="modalCard podcastModalCard podcastApplyGuestModal podcastSponsorFlowModal" onClick={(e) => e.stopPropagation()}>
            <div className="podcastSponsorFlowModal__chrome">
              <div className="podcastSponsorFlowModal__topBar">
                <PodcastSectionHeader
                  titleId="podcast-apply-guest-title"
                  eyebrow="Podcast guests"
                  title="Apply to be on the show"
                  subtitle="Tell us who you are, your topic, and why now — the team reviews every application."
                />
                <button type="button" className="podcastSponsorFlowModal__close" onClick={() => setApplyOpen(false)}>
                  Close
                </button>
              </div>
              <div className="podcastScope podcastSponsorFlowModal__scroll">
                <PodcastApplyGuestForm
                  supabase={supabase}
                  showHeading={false}
                  onSubmitted={() => setTimeout(() => setApplyOpen(false), 900)}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <PodcastSponsorFlowModal
        open={sponsorFlowOpen}
        onClose={() => setSponsorFlowOpen(false)}
        supabase={supabase}
        initialTierId={searchParams.get("tier") || undefined}
        stripeReturn={{
          checkout: searchParams.get("sponsor_checkout") || "",
          sessionId: searchParams.get("session_id") || "",
        }}
      />
    </div>
  );
}
