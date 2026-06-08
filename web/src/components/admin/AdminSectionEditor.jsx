"use client";

/**
 * Reusable admin section wrapper with title, live-site hint, and save feedback slot.
 */
export default function AdminSectionEditor({
  title,
  description,
  liveHint,
  message = "",
  error = "",
  className = "adminPanel",
  children,
}) {
  return (
    <section className={`adminSectionEditor ${className}`.trim()}>
      {title ? (
        <h2 className="adminSectionEditor__title" style={{ marginTop: 0, fontSize: "1.25rem", fontWeight: 700 }}>
          {title}
        </h2>
      ) : null}
      {description ? (
        <p className="adminMuted adminSectionEditor__desc" style={{ lineHeight: 1.55, marginTop: title ? 8 : 0 }}>
          {description}
        </p>
      ) : null}
      {liveHint ? (
        <p className="adminSectionEditor__liveHint adminMuted" style={{ fontSize: "0.8125rem", marginTop: 8 }}>
          <strong>Live site:</strong> {liveHint}
        </p>
      ) : null}
      {error ? (
        <p className="adminSectionEditor__error" role="alert" style={{ color: "var(--color-danger, #b42318)", marginTop: 12 }}>
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="adminSectionEditor__message" role="status" style={{ color: "var(--color-success, #067647)", marginTop: 12 }}>
          {message}
        </p>
      ) : null}
      <div className="adminSectionEditor__body">{children}</div>
    </section>
  );
}
