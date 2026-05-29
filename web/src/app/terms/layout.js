import AppShell from "@/components/layout/AppShell";
import "@/styles/site-route-shell.css";

export default function TermsLayout({ children }) {
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
