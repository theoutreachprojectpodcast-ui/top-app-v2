import AppShell from "@/components/layout/AppShell";
import "@/styles/site-route-shell.css";

export default function NonprofitEinLayout({ children }) {
  return (
    <AppShell
      activeNav="trusted"
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
