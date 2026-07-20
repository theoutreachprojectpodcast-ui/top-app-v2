"use client";

import IconWrap from "@/components/shared/IconWrap";

function PodcastMicIcon() {
  const path =
    "M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm7-3a7 7 0 0 1-14 0M12 18v3M8 21h8";
  return <IconWrap path={path} />;
}

/**
 * Page hero — same structure as Community / main app `cardHero` sections.
 */
export default function PodcastHero({ featured, onApply, onSponsorApply }) {
  const watchHref = featured?.youtube_url || "https://www.youtube.com/@TheOutreachProjectHq";

  return (
    <section className="card cardHero podcastPageHero">
      <div className="communityHeroTop podcastPageHero__top">
        <div className="communityHeroIcon podcastPageHero__icon" aria-hidden="true">
          <PodcastMicIcon />
        </div>
        <div className="communityHeroTitles">
          <p className="introTagline">Podcast</p>
          <h2>Stories of service, resilience, and impact</h2>
        </div>
      </div>
      <p className="communityHeroText podcastPageHero__lead">
        Media-forward conversations from veterans, first responders, nonprofit leaders, and mission-driven partners.
        {featured?.title ? (
          <>
            {" "}
            <span className="podcastPageHero__featuredLabel">Featured:</span> {featured.title}
          </>
        ) : null}
      </p>
      <div className="row wrap podcastPageHero__actions">
        <a className="btnPrimary" href={watchHref} target="_blank" rel="noopener noreferrer">
          Watch on YouTube
        </a>
        <div className="podcastPageHero__applyStack">
          <button className="btnSoft" type="button" onClick={onApply}>
            Apply to be a guest
          </button>
          {typeof onSponsorApply === "function" ? (
            <button className="btnSoft" type="button" onClick={onSponsorApply}>
              Apply to be a podcast sponsor
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
