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
import PodcastSponsorHubSection from "@/features/podcasts/components/PodcastSponsorHubSection";
import PodcastCTASection from "@/features/podcasts/components/PodcastCTASection";
import PodcastApplyGuestForm from "@/features/podcasts/components/PodcastApplyGuestForm";
import MemberOnlyLockSection from "@/features/podcasts/components/MemberOnlyLockSection";
import { listPodcastMemberContent } from "@/features/podcasts/api/podcastApi";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import ProUpgradeModal from "@/components/membership/ProUpgradeModal";
import { getProUpgradeGateContent } from "@/lib/membership/proUpgradeGateCopy";
import { PODCAST_LANDING_RECENT_EPISODE_COUNT } from "@/lib/podcast/podcastLandingCuratedEpisodes";

const FULL_EPISODES_SECTION_COUNT = PODCAST_LANDING_RECENT_EPISODE_COUNT;
const isDevBuild = typeof process !== "undefined" && process.env.NODE_ENV === "development";

function mapUpcomingApiGuests(rows) {
  return (Array.isArray(rows) ? rows : []).map((r) => ({
    id: r.id,
    slug: String(r.id || ""),
    name: r.name || "Guest",
    title:
      [String(r.role_title || "").trim(), String(r.organization || "").trim()].filter(Boolean).join(" · ") ||
      "Upcoming guest",
    bio:
      [String(r.short_description || "").trim(), String(r.episode_topic || "").trim()].filter(Boolean).join(" — ") ||
      "Scheduled conversation — details will be announced soon.",
    avatar_url: String(r.profile_image_url || "").trim(),
    upcoming: true,
  }));
}

export default function PodcastsLandingPage({
  initialEpisodes = [],
  initialSponsors = [],
  initialUpcomingGuests = [],
  initialEpisodeGuests = [],
  initialHeroBandImageUrl = "",
  initialBundleMeta = {},
}) {
  const hasInitialBundle = Array.isArray(initialEpisodes) && initialEpisodes.length > 0;
  const hasInitialSponsors = Array.isArray(initialSponsors) && initialSponsors.length > 0;
  const hasInitialUpcoming = Array.isArray(initialUpcomingGuests) && initialUpcomingGuests.length > 0;
  const hasInitialEpisodeGuests = Array.isArray(initialEpisodeGuests) && initialEpisodeGuests.length > 0;
  const heroBandFromServer = String(initialHeroBandImageUrl || "").trim();

  const supabase = useMemo(() => getSupabaseClient(), []);
  const { entitlements } = useProfileData();
  const hasProPodcastExtras = !!entitlements?.podcastMemberContent;
  const [memberItems, setMemberItems] = useState([]);
  const [episodes, setEpisodes] = useState(() => {
    if (hasInitialBundle) return initialEpisodes;
    return isDevBuild ? FALLBACK_EPISODES : [];
  });
  const [podcastSponsors, setPodcastSponsors] = useState(
    hasInitialSponsors ? initialSponsors : [],
  );
  const [upcomingGuests, setUpcomingGuests] = useState(
    hasInitialUpcoming ? initialUpcomingGuests : [],
  );
  const [podcastBandImageUrl, setPodcastBandImageUrl] = useState(heroBandFromServer);
  const [episodeGuests, setEpisodeGuests] = useState(
    hasInitialEpisodeGuests ? initialEpisodeGuests : [],
  );
  const [loading, setLoading] = useState(() => !hasInitialBundle && !isDevBuild);
  const [bundleNote, setBundleNote] = useState("");
  const [episodeFetchError, setEpisodeFetchError] = useState(() => {
    if (Array.isArray(initialEpisodes) && initialEpisodes.length) return "";
    return humanizePodcastBundleError(initialBundleMeta?.error);
  });
  const [podcastSponsorBillingReady, setPodcastSponsorBillingReady] = useState(true);

  const [applyOpen, setApplyOpen] = useState(false);
  const [sponsorFlowOpen, setSponsorFlowOpen] = useState(false);
  const [sponsorUpgradeOpen, setSponsorUpgradeOpen] = useState(false);
  const sponsorUpgradeCopy = getProUpgradeGateContent("/podcasts/sponsor");

  function openPodcastSponsorApply() {
    if (hasProPodcastExtras) {
      setSponsorFlowOpen(true);
      return;
    }
    setSponsorUpgradeOpen(true);
  }
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!hasProPodcastExtras) return;
    if (searchParams.get("sponsor") === "1") {
      setSponsorFlowOpen(true);
    }
    if (searchParams.get("sponsor_checkout") === "success" || searchParams.get("sponsor_checkout") === "cancel") {
      setSponsorFlowOpen(true);
    }
  }, [searchParams, hasProPodcastExtras]);

  useEffect(() => {
    let cancelled = false;
    listPodcastMemberContent(supabase, { canViewMemberContent: hasProPodcastExtras }).then((rows) => {
      if (!cancelled) setMemberItems(Array.isArray(rows) ? rows : []);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, hasProPodcastExtras]);

  useEffect(() => {
    if (initialBundleMeta?.degraded) {
      setBundleNote(
        "Fewer than five episodes in the curated strip matched the official playlist, or YouTube data was unavailable. Check API keys, playlist ID, and admin include/exclude rules.",
      );
    }
  }, [initialBundleMeta?.degraded]);

  useEffect(() => {
    let cancelled = false;

    const applyBundle = (bundle) => {
      const nextEpisodes = Array.isArray(bundle.episodes) ? bundle.episodes : [];
      if (bundle.ok && nextEpisodes.length) {
        setEpisodeFetchError("");
        setEpisodes(nextEpisodes);
      } else if (nextEpisodes.length) {
        setEpisodeFetchError("");
        setEpisodes(nextEpisodes);
      } else if (!hasInitialBundle) {
        setEpisodes((prev) => (Array.isArray(prev) && prev.length ? prev : nextEpisodes));
        setEpisodeFetchError(
          humanizePodcastBundleError(bundle.error) || "Episodes could not be refreshed.",
        );
      }
      if (bundle?.degraded || initialBundleMeta?.degraded) {
        setBundleNote(
          "Fewer than five episodes in the curated strip matched the official playlist, or YouTube data was unavailable. Check API keys, playlist ID, and admin include/exclude rules.",
        );
      } else if (!initialBundleMeta?.degraded) {
        setBundleNote("");
      }
    };

    (async () => {
      const extrasPromises = [];
      if (!hasInitialSponsors) {
        extrasPromises.push(
          listPodcastSponsorsCatalog(supabase).then((sp) => ({ sponsors: Array.isArray(sp) ? sp : [] })),
        );
      }
      if (!hasInitialEpisodeGuests) {
        extrasPromises.push(
          listPodcastEpisodeGuests(supabase).then((eg) => ({ episodeGuests: eg })),
        );
      }
      if (!hasInitialUpcoming) {
        extrasPromises.push(
          fetch("/api/podcasts/upcoming", { credentials: "include" })
            .then((r) => r.json().catch(() => ({})))
            .then((upcomingRes) => ({
              upcomingGuests: mapUpcomingApiGuests(upcomingRes?.guests),
            })),
        );
      }

      const bundlePromise = hasInitialBundle
        ? fetchPodcastRecentBundle({ background: true })
        : fetchPodcastRecentBundle();

      const [bundle, ...extrasResults] = await Promise.all([
        bundlePromise,
        ...extrasPromises,
      ]);
      if (cancelled) return;

      applyBundle(bundle);
      for (const part of extrasResults) {
        if (part?.sponsors) setPodcastSponsors(part.sponsors);
        if (part?.episodeGuests) setEpisodeGuests(part.episodeGuests);
        if (part?.upcomingGuests) setUpcomingGuests(part.upcomingGuests);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, hasInitialBundle, hasInitialSponsors, hasInitialEpisodeGuests, hasInitialUpcoming, initialBundleMeta?.degraded]);

  useEffect(() => {
    const root = document.querySelector("main.topApp.appShell--podcast");
    if (!root) return;
    if (podcastBandImageUrl) {
      root.style.setProperty("--podcast-band-image", `url("${podcastBandImageUrl}")`);
    } else {
      root.style.removeProperty("--podcast-band-image");
    }
  }, [podcastBandImageUrl]);

  useEffect(() => {
    if (heroBandFromServer) return undefined;
    let cancelled = false;
    fetch("/api/page-images?pageKey=podcasts&sectionKey=hero-band")
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
  }, [heroBandFromServer]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/billing/capabilities", { credentials: "include", cache: "no-store" })
      .then((res) => res.json().catch(() => ({})))
      .then((body) => {
        if (cancelled) return;
        const ready = !!body?.podcastSponsorCheckout;
        setPodcastSponsorBillingReady(ready);
      })
      .catch(() => {
        if (!cancelled) {
          setPodcastSponsorBillingReady(false);
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
    <>
    <div className="podcastScope">
        <PodcastHero
          featured={featured}
          onApply={() => setApplyOpen(true)}
          onSponsorApply={openPodcastSponsorApply}
        />

        <section className="podcastSection">
          <PodcastSectionHeader
            eyebrow="Episode library"
            title="Latest full episodes"
            subtitle="The ten most recent episodes from our official YouTube full-episodes playlist, with thumbnails synced from YouTube."
          />
          {bundleNote ? <p className="podcastMuted">{bundleNote}</p> : null}
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

        <MemberOnlyLockSection canAccess={hasProPodcastExtras} items={memberItems} />

        <section className="podcastSection">
          <PodcastSectionHeader eyebrow="Guest Applications" title="Want to be on the show?" subtitle="Open the in-page application modal to apply." />
          <div className="row wrap">
            <button className="btnPrimary" type="button" onClick={() => setApplyOpen(true)}>
              Apply to Be on the Podcast
            </button>
          </div>
        </section>
        <PodcastSponsorHubSection
          sponsors={podcastSponsors}
          canAccess={hasProPodcastExtras}
          onApply={openPodcastSponsorApply}
          billingNote={
            !podcastSponsorBillingReady && hasProPodcastExtras
              ? "Podcast sponsor tiers use the in-page demo checkout for now. Membership Support and Pro use live Stripe when enabled on Profile."
              : ""
          }
        />
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
      {hasProPodcastExtras ? (
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
      ) : null}
      <ProUpgradeModal
        open={sponsorUpgradeOpen}
        title={sponsorUpgradeCopy.title}
        message={sponsorUpgradeCopy.message}
        feature={sponsorUpgradeCopy.feature}
        onBack={() => setSponsorUpgradeOpen(false)}
      />
    </>
  );
}
