import AppShell from "@/components/layout/AppShell";
import "@/styles/site-route-shell.css";

export default function SponsorsLayout({ children }) {
  return (
    <AppShell
      activeNav="sponsors"
      shellClassName="appShell--siteChrome"
      usePrimaryTopbarChrome
      useFooterDockChrome
      showSiteFooter
      useTopAppStructure
    >
      {children}
    </AppShell>
  );
}
