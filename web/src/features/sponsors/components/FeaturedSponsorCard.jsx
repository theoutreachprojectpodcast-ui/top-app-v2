"use client";

import Avatar from "@/components/shared/Avatar";

export default function FeaturedSponsorCard({ sponsor }) {
  const style = {
    "--sponsor-brand-primary": sponsor.brandPrimary || "#e4bc5c",
    "--sponsor-brand-secondary": sponsor.brandSecondary || "#2f8b96",
    "--sponsor-brand-bg": sponsor.backgroundImageUrl ? `url("${sponsor.backgroundImageUrl}")` : "none",
  };

  return (
    <article className="sponsorFeaturedSpotlight" style={style}>
      <div className="sponsorFeaturedBg" aria-hidden="true" />
      <div className="sponsorFeaturedOverlay" aria-hidden="true" />
      <div className="sponsorFeaturedContent">
        <div className="sponsorFeaturedTop">
          <span className="sponsorFeaturedTier">{sponsor.tierLabel || "Featured sponsor"}</span>
          <span className="sponsorFeaturedTag">{sponsor.tag || "Mission-aligned partner"}</span>
        </div>
        <div className="sponsorFeaturedBrandRow">
          <div className="sponsorFeaturedLogo" aria-hidden="true">{sponsor.logoIcon || sponsor.initials}</div>
          <div className="sponsorFeaturedTitleBlock">
            <h4>{sponsor.name}</h4>
            <p>{sponsor.tagline || "Sponsor spotlight partner supporting service communities."}</p>
          </div>
        </div>
        <div className="sponsorFeaturedActions">
          <a href={sponsor.ctaUrl || "#"} className="btnPrimary" target="_blank" rel="noreferrer">
            {sponsor.ctaLabel || "Visit Sponsor"}
          </a>
        </div>
      </div>
      <div className="sponsorFeaturedProfileWrap">
        <Avatar
          src={sponsor.profileImageUrl || "/assets/top_profile_circle_1024.png"}
          alt={`${sponsor.name} featured profile`}
          className="sponsorFeaturedProfile"
        />
      </div>
    </article>
  );
}

