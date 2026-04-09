"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getSupabaseClient } from "@/lib/supabase/client";
import { resolvePodcastMemberContentAccess, listPodcastMemberContent } from "@/features/podcasts/api/podcastApi";
import "@/features/podcasts/styles/podcasts.css";

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

  const podcastLogoSrc =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_PODCAST_BRAND_LOGO_PATH) ||
    "/podcast-logo-transparent.png";

  return (
    <AppShell
      activeNav="profile"
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
          <h2 className="podcastSectionTitle">Members-Only Content</h2>
          <p className="podcastSectionSubtitle">
            {allowed
              ? "Unlocked for your account — same Pro tier as community story submissions."
              : "Sign in with your Outreach Project account. Pro membership unlocks this library."}
          </p>
          {!allowed ? (
            <p className="podcastSectionSubtitle" style={{ marginTop: 8 }}>
              <a className="podcastSponsorPill" href="/api/auth/workos/signin?returnTo=/podcasts/members">
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
    </AppShell>
  );
}
