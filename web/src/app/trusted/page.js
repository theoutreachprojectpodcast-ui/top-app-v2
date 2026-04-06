import AppShell from "@/components/layout/AppShell";

const SHIELD = "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z";

export default function TrustedPage() {
  return (
    <AppShell activeNav="trusted">
      <section className="panel">
        <div className="ds-page-intro" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="iconWrap" aria-hidden="true">
              <svg className="iconStroke" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d={SHIELD} />
              </svg>
            </span>
            Proven Allies
          </h2>
          <p className="ds-page-intro__lead">
            The full directory experience lives on the home app. Open the site root and tap <strong>Proven Allies</strong>{" "}
            in the dock for curated, verified organizations.
          </p>
        </div>
        <p style={{ marginTop: "16px", color: "var(--color-text-secondary)", lineHeight: 1.55 }}>
          This route is kept for navigation parity while we align multi-page flows with the main experience.
        </p>
      </section>
    </AppShell>
  );
}
