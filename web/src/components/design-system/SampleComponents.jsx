export function GoldPrimaryButton({ children = "Primary Action", ...props }) {
  return (
    <button
      className="rounded-full border px-4 py-2 font-semibold"
      style={{
        background: "linear-gradient(180deg, var(--color-gold-highlight), var(--color-gold-primary))",
        borderColor: "var(--color-gold-shadow)",
        color: "#1c1305",
        boxShadow: "var(--glow-gold)",
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
        border: "1px solid var(--color-border)",
        borderRadius: 14,
        padding: 14,
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
        borderRadius: 10,
        border: "1px solid var(--color-border)",
        background: "rgba(11, 31, 36, 0.7)",
        color: "var(--color-text-primary)",
        padding: "10px 12px",
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
        background: "rgba(3, 8, 10, 0.72)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          background: "linear-gradient(180deg, var(--color-bg-secondary), var(--color-bg-primary))",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 14px 40px rgba(0, 0, 0, 0.5)",
        }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <p style={{ color: "var(--color-text-secondary)" }}>{body}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>{actions}</div>
      </div>
    </div>
  );
}

