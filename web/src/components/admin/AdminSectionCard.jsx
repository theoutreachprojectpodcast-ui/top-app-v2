"use client";

/**
 * Grouped content card for admin editors.
 */
export default function AdminSectionCard({ title = "", description = "", children, className = "" }) {
  return (
    <section className={`adminSectionCard ${className}`.trim()}>
      {title || description ? (
        <header className="adminSectionCard__header">
          {title ? <h3 className="adminSectionCard__title">{title}</h3> : null}
          {description ? <p className="adminSectionCard__desc adminMuted">{description}</p> : null}
        </header>
      ) : null}
      <div className="adminSectionCard__body">{children}</div>
    </section>
  );
}
