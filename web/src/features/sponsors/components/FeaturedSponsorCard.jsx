"use client";

function SocialIcon({ type }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 };
  if (type === "linkedin") {
    return (
      <svg {...common} aria-hidden>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    );
  }
  if (type === "instagram") {
    return (
      <svg {...common} aria-hidden>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === "website") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
      </svg>
    );
  }
  if (type === "facebook") {
    return (
      <svg {...common} aria-hidden>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  }
  if (type === "x") {
    return (
      <svg {...common} aria-hidden>
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20" />
    </svg>
  );
}

export default function FeaturedSponsorCard({ sponsor }) {
  const warm = sponsor.warmVariant || "gold";
  const bg = sponsor.backgroundImageUrl ? `url("${sponsor.backgroundImageUrl}")` : "none";
  const social = sponsor.socialLinks || {};

  return (
    <article className={`sponsorPremiumCard sponsorPremiumCard--${warm}`}>
      <div className="sponsorPremiumCardBg" style={{ backgroundImage: bg }} aria-hidden />
      <div className="sponsorPremiumCardScrim" aria-hidden />
      <div className="sponsorPremiumCardInner">
        <div className="sponsorPremiumCardTop">
          <span className="sponsorPremiumTier">{sponsor.tierLabel || "Partner"}</span>
          <span className="sponsorPremiumTag">{sponsor.tag || "Mission-aligned"}</span>
        </div>
        <div className="sponsorPremiumBrand">
          <div className="sponsorPremiumLogoShell">
            {sponsor.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="sponsorPremiumLogoImg" src={sponsor.logoUrl} alt="" loading="lazy" />
            ) : (
              <span className="sponsorPremiumWordmark">{sponsor.name}</span>
            )}
          </div>
          <div className="sponsorPremiumCopy">
            <h4>{sponsor.name}</h4>
            {sponsor.industry ? <p className="sponsorPremiumIndustry">{sponsor.industry}</p> : null}
            <p className="sponsorPremiumTagline">{sponsor.tagline || "Partner supporting service communities."}</p>
          </div>
        </div>
        <div className="sponsorPremiumFooter">
          <div className="sponsorPremiumSocial" aria-label="Sponsor links">
            {sponsor.ctaUrl && !sponsor.websitePending ? (
              <a
                className="sponsorPremiumSocialLink"
                href={sponsor.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${sponsor.name} website`}
              >
                <SocialIcon type="website" />
              </a>
            ) : null}
            {Object.entries(social).map(([key, url]) => {
              if (!url || key === "website") return null;
              return (
                <a
                  key={key}
                  className="sponsorPremiumSocialLink"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${sponsor.name} on ${key}`}
                >
                  <SocialIcon type={key === "twitter" ? "x" : key} />
                </a>
              );
            })}
          </div>
          <div className="sponsorPremiumCta">
            {sponsor.websitePending || !sponsor.ctaUrl ? (
              <span className="sponsorPremiumPending">{sponsor.ctaLabel || "Website pending"}</span>
            ) : (
              <a className="btnPrimary sponsorPremiumCtaBtn" href={sponsor.ctaUrl} target="_blank" rel="noreferrer">
                {sponsor.ctaLabel || "Visit"}
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
