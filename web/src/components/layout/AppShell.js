import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import HeaderInner from "@/components/layout/HeaderInner";
import SubpageTopbarActions from "@/components/layout/SubpageTopbarActions";

const NAV_ITEMS = [
  { href: "/", key: "home", label: "Home" },
  { href: "/trusted", key: "trusted", label: "Proven Allies" },
  { href: "/community", key: "community", label: "Community" },
  { href: "/profile", key: "profile", label: "Profile" },
  { href: "/contact", key: "contact", label: "Contact" },
];

/**
 * Sub-routes shell: logo is a bare img (client) above the bar row; no Container wrapper on header row.
 */
export default function AppShell({ activeNav, children }) {
  return (
    <div className="appShell appShell--subpage">
      <div className="headerBrandStack">
        <BrandMark size="header" />
      </div>
      <header className="subpageTopbar">
        <HeaderInner className="topbarInner">
          <div className="topbarZone topbarLeft" aria-hidden="true" />
          <div className="topbarZone topbarCenter" aria-hidden="true" />
          <div className="topbarZone topbarRight">
            <SubpageTopbarActions />
          </div>
        </HeaderInner>
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
