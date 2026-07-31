"use client";

/**
 * Grouped content card for admin editors.
 * @param {{ title?: string, description?: string, badge?: import('react').ReactNode, children?: import('react').ReactNode, className?: string }} props
 */
export default function AdminSectionCard({ title = "", description = "", badge = null, children, className = "" }) {
  const showHeader = Boolean(title || description || badge);
  return (
    <section className={`adminSectionCard ${className}`.trim()}>
      {showHeader ? (
        <header className="adminSectionCard__header">
          <div className="adminSectionCard__headerMain">
            {title ? <h3 className="adminSectionCard__title">{title}</h3> : null}
            {description ? <p className="adminSectionCard__desc adminMuted">{description}</p> : null}
          </div>
          {badge ? <div className="adminSectionCard__badge">{badge}</div> : null}
        </header>
      ) : null}
      <div className="adminSectionCard__body">{children}</div>
    </section>
  );
}
