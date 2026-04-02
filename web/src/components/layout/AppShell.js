import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import IconWrap from "@/components/shared/IconWrap";

const SPONSOR_ICON = "M4 6h16v12H4z M4 10h16";

const NAV_ITEMS = [
  { href: "/", key: "home", label: "Home" },
  { href: "/trusted", key: "trusted", label: "Trusted" },
  { href: "/profile", key: "profile", label: "Profile" },
  { href: "/contact", key: "contact", label: "Contact" },
];

/**
 * Sub-routes shell: logo is a bare img (client) above the bar row; no Container wrapper on header row.
 */
export default function AppShell({ activeNav, children }) {
  return (
    <div className="appShell appShell--subpage">
      <header className="subpageTopbar">
        <BrandMark size="header" />
        <div className="siteContainer topbarInner">
          <div className="topbarZone topbarLeft" aria-hidden="true" />
          <div className="topbarZone topbarCenter">
            <div className="headerBrandCopy">
              <p className="headerBrandTitle">The Outreach Project</p>
              <p className="headerBrandSubtitle">Veteran First Responder Resource Network</p>
            </div>
          </div>
          <div className="topbarZone topbarRight">
            <div className="topbarActionsCluster">
              <Link className="btnSoft sponsorBtn" href="/">
                <IconWrap path={SPONSOR_ICON} />
                Become a Sponsor
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="content content--subpage">{children}</main>

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
    </div>
  );
}
