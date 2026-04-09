import Link from "next/link";

export default function SponsorsLayout({ children }) {
  return (
    <main className="topApp theme-clean">
      <header className="sponsorRouteHeader shell">
        <h1>Sponsors</h1>
        <Link className="sponsorRouteBack" href="/">
          Back to app home
        </Link>
      </header>
      <section className="shell sponsorRouteBody">{children}</section>
    </main>
  );
}
