import AppShell from "@/components/layout/AppShell";
import "@/styles/site-route-shell.css";

export default function NotificationsLayout({ children }) {
  return (
    <AppShell
      activeNav="profile"
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
