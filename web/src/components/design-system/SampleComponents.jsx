export function GoldPrimaryButton({ children = "Primary Action", ...props }) {
  return (
    <button
      className="rounded-xl border px-4 py-2 font-semibold"
      style={{
        background: "var(--color-accent)",
        borderColor: "color-mix(in srgb, var(--color-accent-hover) 65%, var(--color-on-accent) 35%)",
        color: "var(--color-on-accent)",
        minHeight: 42,
        boxShadow:
          "var(--glow-accent), 0 2px 10px color-mix(in srgb, var(--color-accent) 18%, transparent)",
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function ResourceCard({ title, location, children }) {
  return (
    <article
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border-subtle)",
        borderRadius: 18,
        padding: 20,
        boxShadow: "var(--shadow-card)",
      }}
    >
      <h3 style={{ margin: 0, color: "var(--color-text-primary)" }}>{title}</h3>
      <p style={{ margin: "6px 0 0", color: "var(--color-text-secondary)" }}>{location}</p>
      <div style={{ marginTop: 10 }}>{children}</div>
    </article>
  );
}

export function SearchInput(props) {
  return (
    <input
      placeholder="City or Organization"
      style={{
        width: "100%",
        borderRadius: 12,
        border: "1px solid var(--color-border-subtle)",
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
        padding: "11px 14px",
        minHeight: 44,
      }}
      {...props}
    />
  );
}

export function MissionModal({ title, body, actions }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--color-overlay-backdrop)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          background: "linear-gradient(180deg, var(--color-bg-card) 0%, var(--color-bg-card-hover) 100%)",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: 18,
          padding: 20,
          boxShadow: "var(--shadow-card-hover)",
        }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <p style={{ color: "var(--color-text-secondary)" }}>{body}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>{actions}</div>
      </div>
    </div>
  );
}
