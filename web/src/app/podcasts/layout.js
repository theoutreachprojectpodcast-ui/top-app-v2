import AppShell from "@/components/layout/AppShell";
import "@/features/podcasts/styles/podcasts.css";

/** Podcast dark shell + logo; topbar auth matches main app via `SubpageTopbarActions`. */
export default function PodcastsLayout({ children }) {
  return (
    <AppShell
      activeNav="podcast"
      shellClassName="appShell--podcast appShell--podcastRoute"
      brandSrc={
        (typeof process !== "undefined" && process.env.NEXT_PUBLIC_PODCAST_BRAND_LOGO_PATH) ||
        "/podcast-logo-transparent.png"
      }
      brandAlt="The Outreach Project Podcast"
      brandClassName="podcastBrandLogo"
      showSiteFooter
      usePrimaryTopbarChrome
      useFooterDockChrome
      useTopAppStructure
      pageAtmosphere="podcast"
    >
      {children}
    </AppShell>
  );
}
