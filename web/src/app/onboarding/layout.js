import AppShell from "@/components/layout/AppShell";
import "@/styles/site-route-shell.css";

export default function OnboardingLayout({ children }) {
  return (
    <AppShell
      activeNav="home"
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
