"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getSupabaseClient } from "@/lib/supabase/client";
import { listSponsorsCatalog } from "@/features/sponsors/api/sponsorCatalogApi";
import {
  FALLBACK_EPISODES,
  FALLBACK_GUESTS,
  FALLBACK_MEMBER,
  canAccessMemberContent,
  listPodcastEpisodeGuests,
  listPodcastEpisodes,
  listPodcastGuestApplications,
  listPodcastGuests,
  listPodcastMemberContent,
} from "@/features/podcasts/api/podcastApi";
import PodcastHero from "@/features/podcasts/components/PodcastHero";
import PodcastSectionHeader from "@/features/podcasts/components/PodcastSectionHeader";
import EpisodeCard from "@/features/podcasts/components/EpisodeCard";
import GuestCard from "@/features/podcasts/components/GuestCard";
import SponsorStrip from "@/features/podcasts/components/SponsorStrip";
import MemberOnlyLockSection from "@/features/podcasts/components/MemberOnlyLockSection";
import PodcastCTASection from "@/features/podcasts/components/PodcastCTASection";
import PodcastGuestApplicationsAdmin from "@/features/podcasts/components/PodcastGuestApplicationsAdmin";
import PodcastApplyGuestForm from "@/features/podcasts/components/PodcastApplyGuestForm";
import "@/features/podcasts/styles/podcasts.css";

export default function PodcastsLandingPage({ initialEpisodes = [] }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [canAccessMembers, setCanAccessMembers] = useState(false);
  const [episodes, setEpisodes] = useState(Array.isArray(initialEpisodes) && initialEpisodes.length ? initialEpisodes : FALLBACK_EPISODES);
  const [guests, setGuests] = useState(FALLBACK_GUESTS);
  const [sponsors, setSponsors] = useState([]);
  const [memberItems, setMemberItems] = useState([]);
  const [episodeGuests, setEpisodeGuests] = useState([]);
  const [guestApplications, setGuestApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCanAccessMembers(canAccessMemberContent());
  }, []);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ep, gs, sp, mc, eg, ga] = await Promise.all([
        listPodcastEpisodes(supabase),
        listPodcastGuests(supabase),
        listSponsorsCatalog(supabase),
        listPodcastMemberContent(supabase, { canViewMemberContent: canAccessMembers }),
        listPodcastEpisodeGuests(supabase),
        listPodcastGuestApplications(supabase),
      ]);
      if (cancelled) return;
      setEpisodes(ep);
      setGuests(gs);
      setSponsors(sp.slice(0, 8));
      setMemberItems(mc);
      setEpisodeGuests(eg);
      setGuestApplications(ga);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [canAccessMembers, supabase]);

  const featured = episodes.find((item) => item.is_featured) || episodes[0] || null;
  const publicEpisodes = episodes.filter((item) => !item.is_member_only).slice(0, 10);
  const canReviewApplications = canAccessMembers;
  const approvedApplications = guestApplications.filter((row) => String(row.status || "").toLowerCase() === "approved");
  const upcomingFromApplications = approvedApplications.map((row) => ({
    id: `application-${row.id}`,
    slug: String(row.full_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    name: row.full_name || "Approved guest",
    title: row.organization || "Upcoming conversation",
    bio: row.topic_pitch || row.why_now || "Approved podcast appearance.",
    upcoming: true,
    website_url: row.website_url || "",
  }));
  const upcomingGuests = [...guests.filter((g) => g.upcoming), ...upcomingFromApplications].slice(0, 6);
  const guestsByEpisode = new Map();
  for (const link of episodeGuests) {
    const episodeId = String(link?.episode_id || "");
    const guest = link?.podcast_guests;
    if (!episodeId || !guest) continue;
    if (!guestsByEpisode.has(episodeId)) guestsByEpisode.set(episodeId, []);
    guestsByEpisode.get(episodeId).push(guest);
  }

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
        <PodcastHero featured={featured} onApply={() => setApplyOpen(true)} />

        <section className="podcastSection">
          <PodcastSectionHeader eyebrow="Featured Guests" title="Voices shaping service communities" subtitle="Guest profiles tied to conversations, impact, and storytelling." />
          <div className="podcastGuestGrid">
            {guests.slice(0, 8).map((guest) => <GuestCard key={guest.id} guest={guest} />)}
          </div>
          {!guests.length ? <p className="podcastMuted">Guest profiles are publishing shortly.</p> : null}
        </section>

        <section className="podcastSection">
          <PodcastSectionHeader eyebrow="Episode Library" title="Last 10 episodes from YouTube" subtitle="Structured feed from The Outreach Project podcast channel." />
          {loading ? <p className="podcastMuted">Loading episodes...</p> : null}
          <div className="podcastEpisodeGrid">
            {publicEpisodes.map((episode) => (
              <EpisodeCard
                key={episode.id || episode.youtube_video_id}
                episode={episode}
                guests={guestsByEpisode.get(String(episode.id || "")) || []}
              />
            ))}
          </div>
          {!publicEpisodes.length ? <p className="podcastMuted">No episodes available yet.</p> : null}
        </section>

        <section className="podcastSection">
          <PodcastSectionHeader eyebrow="Coming Next" title="Upcoming Guests" subtitle="Who is scheduled next on the show." />
          <div className="podcastGuestGrid">
            {(upcomingGuests.length ? upcomingGuests : guests.slice(0, 4)).map((guest) => <GuestCard key={`upcoming-${guest.id}`} guest={guest} />)}
          </div>
          {!upcomingGuests.length ? <p className="podcastMuted">No approved upcoming conversations yet.</p> : null}
        </section>

        <section className="podcastSection">
          <PodcastSectionHeader eyebrow="Guest Applications" title="Want to be on the show?" subtitle="Open the in-page application modal to apply." />
          <div className="row wrap">
            <button className="btnPrimary" type="button" onClick={() => setApplyOpen(true)}>Apply to Be on the Podcast</button>
          </div>
        </section>
        <SponsorStrip sponsors={sponsors} />
        <MemberOnlyLockSection canAccess={canAccessMembers} items={memberItems} />
        <PodcastCTASection onApply={() => setApplyOpen(true)} />
        <hr className="podcastAdminDivider" />
        <section className="podcastSection podcastAdminWrap">
          <PodcastSectionHeader eyebrow="Admin" title="Podcast application review" subtitle="Review, request more info, and accept new guests." />
          {canReviewApplications || guestApplications.length ? (
            <PodcastGuestApplicationsAdmin supabase={supabase} />
          ) : (
            <p className="podcastMuted">Admin review tools appear when podcast applications are available for this account.</p>
          )}
        </section>
      </div>
      {applyOpen ? (
        <div className="modalOverlay podcastModalOverlay" onClick={() => setApplyOpen(false)}>
          <div className="modalCard podcastModalCard" onClick={(e) => e.stopPropagation()}>
            <PodcastApplyGuestForm supabase={supabase} onSubmitted={() => setTimeout(() => setApplyOpen(false), 900)} />
            <div className="row wrap">
              <button className="btnSoft" type="button" onClick={() => setApplyOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
