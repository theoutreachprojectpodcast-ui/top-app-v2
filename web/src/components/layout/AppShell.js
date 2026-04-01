import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", key: "home", label: "Home" },
  { href: "/trusted", key: "trusted", label: "Trusted" },
  { href: "/profile", key: "profile", label: "Profile" },
  { href: "/contact", key: "contact", label: "Contact" },
];

export default function AppShell({ activeNav, children }) {
  return (
    <div className="appShell">
      <header className="topBar">
        <div>
          <div className="brandTitle">THE OUTREACH PROJECT</div>
          <div className="brandSub">Veteran and First Responder Resource Network</div>
        </div>
      </header>

      <main className="content">{children}</main>

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
