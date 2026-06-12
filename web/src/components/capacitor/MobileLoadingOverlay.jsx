"use client";

/**
 * Full-screen branded boot overlay shown while the native app hydrates auth + profile state.
 * @param {{
 *   visible?: boolean,
 *   error?: boolean,
 *   errorMessage?: string,
 *   onRetry?: () => void,
 * }} props
 */
export default function MobileLoadingOverlay({
  visible = true,
  error = false,
  errorMessage = "",
  onRetry,
}) {
  if (!visible) return null;

  return (
    <div
      className={`mobileBootOverlay${error ? " mobileBootOverlay--error" : ""}`}
      role={error ? "alert" : "status"}
      aria-live="polite"
      aria-busy={!error}
    >
      <div className="mobileBootOverlay__inner">
        <img
          className="mobileBootOverlay__logo"
          src="/icon-192.png"
          alt=""
          width={72}
          height={72}
          decoding="async"
        />
        {error ? (
          <>
            <p className="mobileBootOverlay__text mobileBootOverlay__text--error">
              {errorMessage || "Could not reach The Outreach Project servers."}
            </p>
            <p className="mobileBootOverlay__hint">
              Confirm you are online. If this continues, reinstall from TestFlight after the latest app update.
            </p>
            {onRetry ? (
              <button type="button" className="btnPrimary mobileBootOverlay__retry" onClick={onRetry}>
                Try again
              </button>
            ) : null}
          </>
        ) : (
          <>
            <div className="mobileBootOverlay__spinner" aria-hidden="true" />
            <p className="mobileBootOverlay__text">Loading The Outreach Project…</p>
          </>
        )}
      </div>
    </div>
  );
}
