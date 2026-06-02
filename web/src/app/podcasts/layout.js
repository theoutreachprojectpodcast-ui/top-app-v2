import AppShell from "@/components/layout/AppShell";
import "@/styles/site-route-shell.css";
import "@/features/podcasts/styles/podcasts.css";

/** Same site chrome as home/trusted: main logo, theme toggle, notification + account menu. */
export default function PodcastsLayout({ children }) {
  return (
    <AppShell
      activeNav="home"
      shellClassName="appShell--siteChrome appShell--podcastRoute"
      showSiteFooter
      usePrimaryTopbarChrome
      useFooterDockChrome
      useTopAppStructure
      pageAtmosphere="home"
    >
      {children}
    </AppShell>
  );
}
