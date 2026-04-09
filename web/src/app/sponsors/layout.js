import AppShell from "@/components/layout/AppShell";
import "@/features/sponsors/styles/sponsors-shell.css";

export default function SponsorsLayout({ children }) {
  return (
    <AppShell
      activeNav="sponsors"
      shellClassName="appShell--sponsors"
      usePrimaryTopbarChrome
      useFooterDockChrome
      showSiteFooter
      useTopAppStructure
    >
      {children}
    </AppShell>
  );
}
