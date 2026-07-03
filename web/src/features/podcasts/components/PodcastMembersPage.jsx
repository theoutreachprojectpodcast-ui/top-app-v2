"use client";

import { useEffect, useMemo, useState } from "react";
import PublicPageContentSlot from "@/components/content/PublicPageContentSlot";
import { getSupabaseClient } from "@/lib/supabase/client";
import { resolvePodcastMemberContentAccess, listPodcastMemberContent } from "@/features/podcasts/api/podcastApi";
import { readRememberDevicePref } from "@/lib/auth/lastUsedEmail";
import { workosSignInLink } from "@/lib/auth/workosReturnTo";

export default function PodcastMembersPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [items, setItems] = useState([]);
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const access = await resolvePodcastMemberContentAccess();
      if (!cancelled) setAllowed(access);
      const rows = await listPodcastMemberContent(supabase, { canViewMemberContent: access });
      if (!cancelled) setItems(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const podcastMembersSignInHref = workosSignInLink("/podcasts/members", null, "/podcasts/members", {
    rememberDevice: readRememberDevicePref(),
  });

  return (
    <div className="podcastScope">
      <section className="card cardHero podcastPageHero podcastPageHero--compact">
        <div className="communityHeroTop podcastPageHero__top">
          <div className="communityHeroTitles">
            <p className="introTagline">Podcast</p>
            <h2>Members-only content</h2>
          </div>
        </div>
        <PublicPageContentSlot
          pageKey="membership"
          sectionKey="podcast_members_intro"
          className="communityHeroText podcastPageHero__lead"
          fallback={
            <p className="communityHeroText podcastPageHero__lead">
              {allowed
                ? "Unlocked for your account — same Pro tier as community story submissions."
                : "Sign in with your Outreach Project account. Pro membership unlocks this library."}
            </p>
          }
        />
      </section>
      <section className="podcastSection">
        {!allowed ? (
            <p className="podcastMuted" style={{ marginTop: 0 }}>
              <a className="podcastSponsorPill" href={podcastMembersSignInHref}>
                Sign in
              </a>{" "}
              <a className="podcastSponsorPill" href="/profile">
                Check membership
              </a>
            </p>
          ) : null}
          <div className="podcastEpisodeGrid">
            {items.map((item) => (
              <article key={item.id || item.slug} className="podcastEpisodeCard">
                <h3>{item.title}</h3>
                <p>{item.excerpt || item.summary || "Members-only podcast material."}</p>
              </article>
            ))}
          </div>
      </section>
    </div>
  );
}
