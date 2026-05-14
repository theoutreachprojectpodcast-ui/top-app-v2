"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppHeaderBrand from "@/components/layout/AppHeaderBrand";
import SiteBottomNavGlyph from "@/components/navigation/SiteBottomNavGlyph";
import SiteMobileNavMoreMenu from "@/components/navigation/SiteMobileNavMoreMenu";
import HeaderInner from "@/components/layout/HeaderInner";
import SubpageTopbarActions from "@/components/layout/SubpageTopbarActions";
import FooterInner from "@/components/layout/FooterInner";
import MissionPageTopStrip from "@/components/layout/MissionPageTopStrip";
import { resolvePageAtmosphere } from "@/lib/design/pageAtmosphere";
import { useImmersiveHeaderScroll } from "@/hooks/useImmersiveHeaderScroll";

const PRIMARY_BOTTOM_NAV_KEYS = new Set(["home", "profile", "contact"]);

const NAV_ITEMS = [
  { href: "/", key: "home", label: "Home", linkTitle: "Home" },
  { href: "/trusted", key: "trusted", label: "Trusted", linkTitle: "Trusted Resources" },
  { href: "/community", key: "community", label: "Community", linkTitle: "Community" },
  { href: "/sponsors", key: "sponsors", label: "Sponsors", linkTitle: "Sponsors" },
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
  const mainRef = useRef(null);
  const pathname = usePathname();
  const missionStripOnHome = pathname === "/";
  const items = Array.isArray(navItems) && navItems.length ? navItems : NAV_ITEMS;
  const RootTag = useTopAppStructure ? "main" : "div";
  const pageAtmosphere = pageAtmosphereProp ?? resolvePageAtmosphere(pathname, activeNav);
  const podcastThemeShell =
    pageAtmosphere === "podcast" || String(shellClassName || "").includes("appShell--podcast");
  const immersiveHeaderScroll = useTopAppStructure && !podcastThemeShell;
  useImmersiveHeaderScroll({ rootRef: mainRef, enabled: immersiveHeaderScroll });

  const mainChromeClass = immersiveHeaderScroll ? " header-at-top" : "";
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
      ref={useTopAppStructure ? mainRef : undefined}
      className={`${useTopAppStructure ? "topApp" : "appShell"} appShell--subpage ${useFooterDockChrome ? "appShell--withMobileNavDock " : ""}${shellClassName}${mainChromeClass}`.trim()}
      style={rootStyle}
      {...(useTopAppStructure ? { "data-page-atmosphere": pageAtmosphere } : {})}
      {...podcastRouteAttrs}
    >
      <AppHeaderBrand brandSrc={brandSrc || undefined} brandAlt={brandAlt} brandClassName={brandClassName} />
      <header className={usePrimaryTopbarChrome ? "topbar" : "subpageTopbar"}>
        <HeaderInner className="topbarInner">
          <div className="topbarZone topbarLeft">
            <div className="topbarActionsCluster topbarActionsCluster--start">
              {useFooterDockChrome ? (
                <SiteMobileNavMoreMenu
                  tone={podcastThemeShell ? "podcast" : "app"}
                  forceDesktopVisible={!!podcastThemeShell}
                >
                  <Link className="siteMobileNavMore__entry" href="/trusted">
                    Trusted Resources
                  </Link>
                  <Link className="siteMobileNavMore__entry" href="/community">
                    Community
                  </Link>
                  <Link className="siteMobileNavMore__entry" href="/sponsors">
                    Sponsors
                  </Link>
                  {podcastThemeShell ? (
                    <Link className="siteMobileNavMore__entry" href="/">
                      Main app home
                    </Link>
                  ) : (
                    <Link className="siteMobileNavMore__entry" href="/podcasts">
                      Podcast
                    </Link>
                  )}
                  <Link className="siteMobileNavMore__entry" href="/sponsors">
                    Become a Sponsor
                  </Link>
                </SiteMobileNavMoreMenu>
              ) : null}
              <SubpageTopbarActions section="lead" showThemeToggle={showThemeToggle} />
            </div>
          </div>
          <div className="topbarZone topbarCenter" aria-hidden="true" />
          <div className="topbarZone topbarRight">
            <div className="topbarActionsCluster">
              <SubpageTopbarActions section="auth" />
            </div>
          </div>
        </HeaderInner>
      </header>
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
      {useFooterDockChrome ? <div className="footerDockBackdrop" aria-hidden="true" /> : null}
      {useFooterDockChrome ? (
        <div className="footerDock">
          <FooterInner className="footerNavInner">
            <nav
              className={`bottomNav bottomNav--withIcons${useFooterDockChrome ? " bottomNav--mobileDock" : ""}`}
              aria-label="Bottom navigation"
            >
              {items.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  title={item.linkTitle || item.label}
                  className={`navItem navItem--dockCol ${
                    PRIMARY_BOTTOM_NAV_KEYS.has(item.key) ? "navItem--dockPrimary" : "navItem--dockOverflow"
                  } ${activeNav === item.key ? "isActive" : ""}`}
                >
                  <SiteBottomNavGlyph navKey={item.key} className="navItemGlyph" />
                  <span className="navItemLabel">{item.label}</span>
                </Link>
              ))}
            </nav>
          </FooterInner>
        </div>
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
              className={`navItem navItem--dockCol ${
                PRIMARY_BOTTOM_NAV_KEYS.has(item.key) ? "navItem--dockPrimary" : "navItem--dockOverflow"
              } ${activeNav === item.key ? "isActive" : ""}`}
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
