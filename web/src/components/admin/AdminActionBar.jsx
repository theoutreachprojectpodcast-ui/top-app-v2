"use client";

/**
 * Primary / secondary action row (non-sticky).
 */
export default function AdminActionBar({ children, className = "" }) {
  return <div className={`adminActionBar ${className}`.trim()}>{children}</div>;
}

/**
 * Sticky bottom save/publish bar for long editors.
 */
export function AdminSaveBar({
  dirty = false,
  message = "",
  primaryLabel = "Save changes",
  onPrimary,
  primaryDisabled = false,
  secondary = null,
}) {
  return (
    <div className={`adminSaveBar${dirty ? " isDirty" : ""}`} role="region" aria-label="Save actions">
      <div className="adminSaveBar__status">
        {dirty ? <span className="adminSaveBar__dirty">Unsaved changes</span> : null}
        {message ? <span className="adminMuted">{message}</span> : null}
      </div>
      <div className="adminSaveBar__actions">
        {secondary}
        <button type="button" className="btnPrimary" disabled={primaryDisabled || !onPrimary} onClick={onPrimary}>
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
