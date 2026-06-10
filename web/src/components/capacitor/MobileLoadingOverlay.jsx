"use client";

/**
 * Full-screen branded boot overlay shown while the native app hydrates auth + profile state.
 * @param {{ visible?: boolean }} props
 */
export default function MobileLoadingOverlay({ visible = true }) {
  if (!visible) return null;

  return (
    <div className="mobileBootOverlay" role="status" aria-live="polite" aria-busy="true">
      <div className="mobileBootOverlay__inner">
        <img
          className="mobileBootOverlay__logo"
          src="/icon-192.png"
          alt=""
          width={72}
          height={72}
          decoding="async"
        />
        <div className="mobileBootOverlay__spinner" aria-hidden="true" />
        <p className="mobileBootOverlay__text">Loading The Outreach Project…</p>
      </div>
    </div>
  );
}
