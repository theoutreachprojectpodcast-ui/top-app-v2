import AppShell from "@/components/layout/AppShell";
import "@/styles/site-route-shell.css";
import "@/features/trusted-resources/trusted-resources-cards.css";
import "@/features/trusted-resources/trusted-resource-detail.css";

export default function TrustedLayout({ children }) {
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
