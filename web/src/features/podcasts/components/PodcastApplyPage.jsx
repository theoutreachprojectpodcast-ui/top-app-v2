"use client";

import { useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import { getSupabaseClient } from "@/lib/supabase/client";
import PodcastApplyGuestForm from "@/features/podcasts/components/PodcastApplyGuestForm";
import "@/features/podcasts/styles/podcasts.css";

export default function PodcastApplyPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
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
          <h2 className="podcastSectionTitle">Apply to Be on the Podcast</h2>
          <p className="podcastSectionSubtitle">Share your story and pitch. The production team reviews every application.</p>
        </section>
        <PodcastApplyGuestForm supabase={supabase} />
      </div>
    </AppShell>
  );
}
