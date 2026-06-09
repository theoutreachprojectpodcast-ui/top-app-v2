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
      {title ? <h2 className="adminSectionEditor__title">{title}</h2> : null}
      {description ? (
        <p className="adminMuted adminSectionEditor__desc">{description}</p>
      ) : null}
      {liveHint ? (
        <p className="adminSectionEditor__liveHint adminMuted">
          <strong>Live site:</strong> {liveHint}
        </p>
      ) : null}
      {error ? (
        <p className="adminFeedback adminFeedback--error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="adminFeedback adminFeedback--success" role="status">
          {message}
        </p>
      ) : null}
      <div className="adminSectionEditor__body">{children}</div>
    </section>
  );
}
