"use client";

/**
 * Lightweight preview panel (slide-over or inline).
 * Prefer wrapping existing public components as children.
 */
export default function AdminPreviewPanel({
  title = "Preview",
  open = true,
  onClose,
  children,
  variant = "inline",
}) {
  if (!open) return null;

  if (variant === "drawer") {
    return (
      <div className="adminPreviewPanel adminPreviewPanel--drawer" role="dialog" aria-label={title}>
        <div className="adminPreviewPanel__toolbar">
          <strong>{title}</strong>
          {onClose ? (
            <button type="button" className="btnSoft" onClick={onClose}>
              Close
            </button>
          ) : null}
        </div>
        <div className="adminPreviewPanel__frame">
          <p className="adminPreviewPanel__badge">Preview — not published</p>
          {children}
        </div>
      </div>
    );
  }

  return (
    <aside className="adminPreviewPanel adminPreviewPanel--inline" aria-label={title}>
      <div className="adminPreviewPanel__toolbar">
        <strong>{title}</strong>
      </div>
      <div className="adminPreviewPanel__frame">
        <p className="adminPreviewPanel__badge">Preview — not published</p>
        {children}
      </div>
    </aside>
  );
}
