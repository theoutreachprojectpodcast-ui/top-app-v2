"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getSupabaseClient } from "@/lib/supabase/client";
import { canAccessMemberContent, listPodcastMemberContent } from "@/features/podcasts/api/podcastApi";
import "@/features/podcasts/styles/podcasts.css";

export default function PodcastMembersPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [items, setItems] = useState([]);
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const access = canAccessMemberContent();
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
          <p className="podcastSectionSubtitle">{allowed ? "Unlocked content for active members." : "Member access required to unlock full content."}</p>
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
