import AppShell from "@/components/layout/AppShell";
import "@/styles/site-route-shell.css";

export default function PrivacyLayout({ children }) {
  return (
    <AppShell
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
