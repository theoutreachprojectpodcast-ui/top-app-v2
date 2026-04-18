import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import HeaderInner from "@/components/layout/HeaderInner";
import SubpageTopbarActions from "@/components/layout/SubpageTopbarActions";
import FooterInner from "@/components/layout/FooterInner";

const NAV_ITEMS = [
  { href: "/", key: "home", label: "Home" },
  { href: "/trusted", key: "trusted", label: "Trusted Resources" },
  { href: "/community", key: "community", label: "Community" },
  { href: "/sponsors", key: "sponsors", label: "Partners" },
  { href: "/profile", key: "profile", label: "Profile" },
  { href: "/contact", key: "contact", label: "Contact" },
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
}) {
  const RootTag = useTopAppStructure ? "main" : "div";
  return (
    <RootTag className={`${useTopAppStructure ? "topApp" : "appShell"} appShell--subpage ${shellClassName}`.trim()}>
      <div className="headerBrandStack">
        <BrandMark size="header" src={brandSrc || undefined} alt={brandAlt} className={brandClassName} />
      </div>
      <header className={usePrimaryTopbarChrome ? "topbar" : "subpageTopbar"}>
        <HeaderInner className="topbarInner">
          <div className="topbarZone topbarLeft">
            <div className="topbarActionsCluster topbarActionsCluster--start">
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
        <section className="shell">{children}</section>
      ) : (
        <main className="content content--subpage">{children}</main>
      )}

      {showSiteFooter ? (
        <footer className="siteFooter">
          <FooterInner className="footerInner">
            <div>
              <div className="brandName">THE OUTREACH PROJECT</div>
              <p className="footerNote">Mission-first resource navigation for veterans, first responders, and supporters.</p>
            </div>
            <p className="footerNote">Trust-driven support, built for clarity under pressure.</p>
          </FooterInner>
        </footer>
      ) : null}

      {useFooterDockChrome ? <div className="footerDockBackdrop" aria-hidden="true" /> : null}
      {useFooterDockChrome ? (
        <div className="footerDock">
          <FooterInner className="footerNavInner">
            <nav className="bottomNav" aria-label="Primary">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`navItem ${activeNav === item.key ? "isActive" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </FooterInner>
        </div>
      ) : (
        <nav className="bottomNav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`navItem ${activeNav === item.key ? "isActive" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </RootTag>
  );
}
