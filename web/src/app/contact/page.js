import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="sponsorPage sponsorLanding">
      <section className="panel">
        <h1>Contact (Coming Soon)</h1>
        <p>
          Contact and crisis support flows are being finalized for the multi-page app.
          Until then, core account and community support tools remain available.
        </p>
        <div style={{ marginTop: "18px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link href="/profile" className="btnPrimary">
            Open Profile
          </Link>
          <Link href="/community" className="btnSoft">
            Open Community
          </Link>
        </div>
      </section>
    </div>
  );
}
