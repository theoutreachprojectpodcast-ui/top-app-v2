import Link from "next/link";
import Container from "@/components/layout/Container";
import HeaderBrandLockup from "@/components/layout/HeaderBrandLockup";
import IconWrap from "@/components/shared/IconWrap";

const SPONSOR_ICON = "M4 6h16v12H4z M4 10h16";

const NAV_ITEMS = [
  { href: "/", key: "home", label: "Home" },
  { href: "/trusted", key: "trusted", label: "Trusted" },
  { href: "/profile", key: "profile", label: "Profile" },
  { href: "/contact", key: "contact", label: "Contact" },
];

/**
 * Sub-routes shell: same three-zone header as the main app (1fr | auto | 1fr) for visual continuity.
 * Sponsor links home; full sponsor flow lives on the main experience.
 */
export default function AppShell({ activeNav, children }) {
  return (
    <div className="appShell appShell--subpage">
      <header className="subpageTopbar">
        <Container className="topbarInner">
          <div className="topbarZone topbarLeft" aria-hidden="true" />
          <div className="topbarZone topbarCenter">
            <HeaderBrandLockup />
          </div>
          <div className="topbarZone topbarRight">
            <div className="topbarActionsCluster">
              <Link className="btnSoft sponsorBtn" href="/">
                <IconWrap path={SPONSOR_ICON} />
                Become a Sponsor
              </Link>
            </div>
          </div>
        </Container>
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
