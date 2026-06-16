"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppHeaderBrand from "@/components/layout/AppHeaderBrand";
import ColorSchemeToggle from "@/components/app/ColorSchemeToggle";
import SiteBottomNavGlyph from "@/components/navigation/SiteBottomNavGlyph";
import SiteMobileNavMoreMenu from "@/components/navigation/SiteMobileNavMoreMenu";
import HeaderInner from "@/components/layout/HeaderInner";
import SubpageTopbarActions from "@/components/layout/SubpageTopbarActions";
import AdminConsoleLink from "@/components/admin/AdminConsoleLink";
import FooterInner from "@/components/layout/FooterInner";
import MissionPageTopStrip from "@/components/layout/MissionPageTopStrip";
import { useNavAuthState } from "@/hooks/useNavAuthState";
import { useMobileShell } from "@/hooks/useMobileShell";
import { usePodcastDarkSchemeLock } from "@/hooks/usePodcastDarkSchemeLock";
import { resolvePageAtmosphere } from "@/lib/design/pageAtmosphere";
import { useImmersiveHeaderScroll } from "@/hooks/useImmersiveHeaderScroll";
import CapacitorFooterPortal from "@/components/capacitor/CapacitorFooterPortal";
import { SITE_MOBILE_DOCK_ITEMS } from "@/components/navigation/siteBottomNavConfig";

const NAV_ITEMS = [
  { href: "/", key: "home", label: "Home", linkTitle: "Home" },
  { href: "/trusted", key: "trusted", label: "Trusted", linkTitle: "Trusted Resources" },
  { href: "/community", key: "community", label: "Community", linkTitle: "Community" },
  { href: "/sponsors", key: "sponsors", label: "Sponsors", linkTitle: "Sponsors" },
  { href: "/podcasts", key: "podcast", label: "Podcast", linkTitle: "Podcast" },
  { href: "/profile", key: "profile", label: "Profile", linkTitle: "Profile" },
  { href: "/contact", key: "contact", label: "Contact", linkTitle: "Contact" },
];

/**
 * Sub-routes shell: logo is a bare img (client) above the bar row; no Container wrapper on header row.
 */
export default function AppShell({
  activeNav,
  children,
  shellClassName = "",
  brandSrc = "",
  brandAlt = "The Outreach Project",
  brandClassName = "",
  showSiteFooter = false,
  usePrimaryTopbarChrome = false,
  useFooterDockChrome = false,
  useTopAppStructure = false,
  showThemeToggle = true,
  navItems,
  rootStyle,
  pageAtmosphere: pageAtmosphereProp,
}) {
  const shellRef = useRef(null);
  const pathname = usePathname();
  const missionStripOnHome = pathname === "/";
  const items = Array.isArray(navItems) && navItems.length ? navItems : NAV_ITEMS;
  const RootTag = useTopAppStructure ? "main" : "div";
  const pageAtmosphere = pageAtmosphereProp ?? resolvePageAtmosphere(pathname, activeNav);
  const podcastThemeShell =
    pageAtmosphere === "podcast" || String(shellClassName || "").includes("appShell--podcast");
  const immersiveHeaderScroll = useTopAppStructure && !podcastThemeShell;
  const headerGradientBoost = usePrimaryTopbarChrome || useTopAppStructure;
  useImmersiveHeaderScroll({
    rootRef: shellRef,
    enabled: immersiveHeaderScroll,
    gradientBoost: headerGradientBoost,
  });
  usePodcastDarkSchemeLock(podcastThemeShell);

  const { authed: isLoggedIn } = useNavAuthState();
  const isMobileShell = useMobileShell();

  const mainChromeClass = immersiveHeaderScroll ? " header-at-top" : "";
  const authChromeClass = useTopAppStructure ? (isLoggedIn ? " topApp--auth-in" : " topApp--auth-out") : "";
  const podcastRouteAttrs =
    useTopAppStructure && podcastThemeShell
      ? {
          "data-use-podcast-theme": "true",
          "data-disable-global-background": "true",
          "data-disable-main-page-header-blend": "true",
        }
      : {};
  return (
    <RootTag
      ref={headerGradientBoost || useTopAppStructure ? shellRef : undefined}
      className={`${useTopAppStructure ? "topApp" : "appShell"} appShell--subpage ${useFooterDockChrome ? "appShell--withMobileNavDock " : ""}${shellClassName}${mainChromeClass}${authChromeClass}`.trim()}
      {...(podcastThemeShell ? { "data-podcast-theme-locked": "dark" } : {})}
      style={rootStyle}
      {...(useTopAppStructure ? { "data-page-atmosphere": pageAtmosphere } : {})}
      {...podcastRouteAttrs}
    >
      <div className={`appSiteHeader${podcastThemeShell ? " appSiteHeader--podcast" : ""}`}>
        {podcastThemeShell ? (
          <>
            <header className={usePrimaryTopbarChrome ? "topbar" : "subpageTopbar"}>
              <HeaderInner className="topbarInner">
                <div className="topbarZone topbarLeft">
                  <div className="topbarActionsCluster topbarActionsCluster--start">
                    <SubpageTopbarActions section="authNotifications" />
                    <SubpageTopbarActions section="lead" />
                  </div>
                </div>
                <div className="topbarZone topbarCenter" aria-hidden="true" />
                <div className="topbarZone topbarRight">
                  <div className="topbarActionsCluster">
                    <SubpageTopbarActions section="authMenu" />
                    {useFooterDockChrome ? (
                      <SiteMobileNavMoreMenu tone="podcast" align="end">
                        <Link className="siteMobileNavMore__entry" href="/trusted">
                          Trusted Resources
                        </Link>
                        <Link className="siteMobileNavMore__entry" href="/community">
                          Community
                        </Link>
                        <Link className="siteMobileNavMore__entry" href="/sponsors">
                          Sponsors
                        </Link>
                        <Link className="siteMobileNavMore__entry" href="/contact">
                          Contact
                        </Link>
                        <Link className="siteMobileNavMore__entry" href="/">
                          Main app home
                        </Link>
                        <Link className="siteMobileNavMore__entry" href="/sponsors">
                          Become a Sponsor
                        </Link>
                      </SiteMobileNavMoreMenu>
                    ) : null}
                  </div>
                </div>
              </HeaderInner>
            </header>
            <AppHeaderBrand
              brandSrc={brandSrc || undefined}
              brandAlt={brandAlt}
              brandClassName={brandClassName}
            />
          </>
        ) : (
          <>
            <AppHeaderBrand
              brandSrc={brandSrc || undefined}
              brandAlt={brandAlt}
              brandClassName={brandClassName}
            />
            <header className={usePrimaryTopbarChrome ? "topbar" : "subpageTopbar"}>
              <HeaderInner className="topbarInner">
                <div className="topbarZone topbarLeft">
                  <div className="topbarActionsCluster topbarActionsCluster--start">
                    {useFooterDockChrome ? (
                      <SiteMobileNavMoreMenu tone="app" align="start">
                        <Link className="siteMobileNavMore__entry" href="/trusted">
                          Trusted Resources
                        </Link>
                        <Link className="siteMobileNavMore__entry" href="/community">
                          Community
                        </Link>
                        <Link className="siteMobileNavMore__entry" href="/sponsors">
                          Sponsors
                        </Link>
                        <Link className="siteMobileNavMore__entry" href="/contact">
                          Contact
                        </Link>
                        <Link className="siteMobileNavMore__entry" href="/sponsors">
                          Become a Sponsor
                        </Link>
                      </SiteMobileNavMoreMenu>
                    ) : null}
                    {isMobileShell && !podcastThemeShell && showThemeToggle ? <ColorSchemeToggle /> : null}
                    {isMobileShell && isLoggedIn ? <AdminConsoleLink /> : null}
                    <SubpageTopbarActions section="lead" />
                  </div>
                </div>
                <div className="topbarZone topbarCenter" aria-hidden="true" />
                <div className="topbarZone topbarRight">
                  <div className="topbarActionsCluster">
                    {!isMobileShell && !podcastThemeShell && showThemeToggle ? <ColorSchemeToggle /> : null}
                    <SubpageTopbarActions section="auth" />
                  </div>
                </div>
              </HeaderInner>
            </header>
          </>
        )}
      </div>
      {usePrimaryTopbarChrome ? <div className="topbarOcclusion" aria-hidden="true" /> : null}

      {useTopAppStructure ? (
        <section className="shell">
          {showSiteFooter && missionStripOnHome ? <MissionPageTopStrip placement="top" /> : null}
          {children}
          {showSiteFooter && !missionStripOnHome ? <MissionPageTopStrip placement="bottom" /> : null}
        </section>
      ) : (
        <main className="content content--subpage">
          {showSiteFooter && missionStripOnHome ? <MissionPageTopStrip placement="top" /> : null}
          {children}
          {showSiteFooter && !missionStripOnHome ? <MissionPageTopStrip placement="bottom" /> : null}
        </main>
      )}

      {/* Fixed bottom nav dock (not .siteFooter). */}
      {useFooterDockChrome ? (
        <CapacitorFooterPortal>
          <div className="footerDockBackdrop" aria-hidden="true" />
          <div className="footerDock">
            <FooterInner className="footerNavInner">
              <nav
                className={`bottomNav bottomNav--withIcons${useFooterDockChrome ? " bottomNav--mobileDock" : ""}`}
                aria-label="Bottom navigation"
              >
                {SITE_MOBILE_DOCK_ITEMS.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    title={item.linkTitle || item.label}
                    data-nav-key={item.key}
                    className={`navItem navItem--dockCol navItem--dockPrimary ${activeNav === item.key ? "isActive" : ""}`}
                  >
                    <SiteBottomNavGlyph navKey={item.key} className="navItemGlyph" />
                    <span className="navItemLabel">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </FooterInner>
          </div>
        </CapacitorFooterPortal>
      ) : (
        <nav
          className={`bottomNav bottomNav--withIcons${useFooterDockChrome ? " bottomNav--mobileDock" : ""}`}
          aria-label="Bottom navigation"
        >
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              title={item.linkTitle || item.label}
              className={`navItem navItem--dockCol ${activeNav === item.key ? "isActive" : ""}`}
            >
              <SiteBottomNavGlyph navKey={item.key} className="navItemGlyph" />
              <span className="navItemLabel">{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </RootTag>
  );
}
