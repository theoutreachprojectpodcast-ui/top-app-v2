/**
 * @param {{ readiness?: 'partial' | 'placeholder', title?: string, children?: import('react').ReactNode }} props
 */
export default function AdminScopeBanner({ readiness = "partial", title = "In development", children }) {
  const isPlaceholder = readiness === "placeholder";
  return (
    <div
      className="adminScopeBanner"
      role="status"
      style={{
        marginBottom: 16,
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${isPlaceholder ? "var(--color-border-subtle)" : "color-mix(in srgb, var(--color-accent) 25%, var(--color-border-subtle))"}`,
        background: isPlaceholder
          ? "color-mix(in srgb, var(--color-bg-secondary) 70%, transparent)"
          : "color-mix(in srgb, var(--color-accent) 8%, transparent)",
      }}
    >
      <strong style={{ display: "block", marginBottom: 4 }}>{title}</strong>
      <span className="adminMuted" style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>
        {children ||
          (isPlaceholder
            ? "This module is planned but not fully implemented. Navigation remains available so operators know where it will live."
            : "Core workflows work; some advanced features are still being expanded.")}
      </span>
    </div>
  );
}
