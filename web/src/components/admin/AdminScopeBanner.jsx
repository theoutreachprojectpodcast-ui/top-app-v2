/**
 * @param {{ readiness?: 'partial' | 'placeholder', title?: string, children?: import('react').ReactNode }} props
 */
export default function AdminScopeBanner({ readiness = "partial", title = "In development", children }) {
  const isPlaceholder = readiness === "placeholder";
  return (
    <div
      className={`adminScopeBanner${isPlaceholder ? " adminScopeBanner--placeholder" : ""}`}
      role="status"
    >
      <strong className="adminScopeBanner__title">{title}</strong>
      <span className="adminScopeBanner__body adminMuted">
        {children ||
          (isPlaceholder
            ? "This module is planned but not fully implemented. Navigation remains available so operators know where it will live."
            : "Core workflows work; some advanced features are still being expanded.")}
      </span>
    </div>
  );
}
