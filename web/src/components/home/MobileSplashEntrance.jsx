"use client";

import BrandMark from "@/components/BrandMark";

/**
 * Guest-only mobile entrance — splash with auth CTAs at the top of home content.
 * Phone viewports only (≤760px); hidden on desktop and when signed in.
 */
export default function MobileSplashEntrance({ onSignIn, onCreateAccount }) {
  return (
    <section className="homeMobileSplashEntrance" aria-label="Welcome">
      <div className="homeMobileSplashEntrance__brand">
        <BrandMark variant="mark" size="splash" alt="The Outreach Project" />
      </div>
      <p className="homeMobileSplashEntrance__title">The Outreach Project</p>
      <p className="homeMobileSplashEntrance__lead">
        Connect with sponsors, trusted resources, and the veteran community.
      </p>
      <div className="homeMobileSplashEntrance__actions">
        <button type="button" className="btnPrimary homeMobileSplashEntrance__btn" onClick={onSignIn}>
          Sign in
        </button>
        <button type="button" className="btnSoft homeMobileSplashEntrance__btn" onClick={onCreateAccount}>
          Create account
        </button>
      </div>
    </section>
  );
}
