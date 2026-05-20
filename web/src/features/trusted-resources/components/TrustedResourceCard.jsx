"use client";

import { useId, useMemo } from "react";
import Link from "next/link";
import NonprofitIcon from "@/features/nonprofits/components/NonprofitIcon";
import NonprofitSocialLinks from "@/features/nonprofits/components/NonprofitSocialLinks";

/** @param {{ resource: object }} props */
export default function TrustedResourceCard({ resource }) {
  const titleId = useId();
  const {
    id,
    name,
    logoImage,
    headerImage,
    headerIsFallback,
    trustedResourceCategory,
    category,
    shortDescription,
    fullDescription,
    linkItems,
    locationLabel,
    detailPath,
    profilePath,
    trustedResourceSlug,
    einIdentityVerified,
  } = resource;

  const cat = trustedResourceCategory || category;

  const safeLinks = useMemo(() => {
    return (Array.isArray(linkItems) ? linkItems : []).filter((item) => {
      const u = item && typeof item.url === "string" ? item.url.trim() : "";
      return !!u;
    });
  }, [linkItems]);

  const socialLinksForRow = useMemo(() => {
    return safeLinks.map((item) => {
      const label =
        item.type === "website"
          ? `${name} website`
          : item.type === "email"
            ? `Email ${name}`
            : `${name} on ${item.label || item.type}`;
      return { ...item, label };
    });
  }, [safeLinks, name]);

  const showMore =
    fullDescription &&
    shortDescription &&
    fullDescription.trim() !== shortDescription.trim() &&
    fullDescription.length > shortDescription.length + 12;

  const heroClass = [
    "trustedResourceCard__hero",
    headerIsFallback ? "trustedResourceCard__hero--fallback" : "trustedResourceCard__hero--photo",
  ].join(" ");

  const safeHero = headerImage ? headerImage.replace(/'/g, "%27") : "";
  const resourceHref = detailPath || (trustedResourceSlug ? `/trusted/${trustedResourceSlug}` : "");

  return (
    <article
      className={`trustedResourceCard${resourceHref ? " trustedResourceCard--navigable" : ""}`}
      data-trusted-resource-id={id}
      aria-labelledby={titleId}
    >
      {resourceHref ? (
        <Link
          className="trustedResourceCard__hitLayer"
          href={resourceHref}
          aria-label={`View profile for ${name}`}
          tabIndex={-1}
        />
      ) : null}
      <div className="trustedResourceCard__media">
        <div className="trustedResourceCard__headerFrame">
          <div
            className={heroClass}
            style={safeHero ? { backgroundImage: `url('${safeHero}')` } : undefined}
            aria-hidden
          />
          <div className="trustedResourceCard__heroScrim" aria-hidden />
          <div className="trustedResourceCard__heroRibbon" aria-hidden>
            <span className="trustedResourceCard__typeMark">Trusted Resource</span>
          </div>
        </div>
      </div>

      <div className="trustedResourceCard__body">
        <header className="trustedResourceCard__profileHead">
          <div className="trustedResourceCard__logoFrame">
            {logoImage ? (
              <img
                className="trustedResourceCard__logoImg"
                src={logoImage}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="trustedResourceCard__logoFallback" aria-hidden>
                <NonprofitIcon category={cat} size={42} variant="default" />
              </div>
            )}
          </div>
          <div className="trustedResourceCard__titleBlock">
            <h3 className="trustedResourceCard__title" id={titleId}>
              <span className="trustedResourceCard__titleText">{name}</span>
            </h3>
            <div className="trustedResourceCard__chipRow">
              <span
                className="trustedResourceCard__categoryChip"
                style={{ "--tr-chip-tint": cat?.tint || "rgba(110, 168, 207, 0.22)" }}
              >
                {cat?.label || "Trusted resource"}
              </span>
            </div>
            <p className="trustedResourceCard__location">{locationLabel}</p>
          </div>
        </header>

        {shortDescription ? <p className="trustedResourceCard__short">{shortDescription}</p> : null}

        {showMore ? (
          <details className="trustedResourceCard__details">
            <summary className="trustedResourceCard__detailsSummary">Full description</summary>
            <p className="trustedResourceCard__full">{fullDescription}</p>
          </details>
        ) : null}

        <div className="trustedResourceCard__footer">
          {socialLinksForRow.length ? (
            <NonprofitSocialLinks className="trustedResourceCard__socialLinks" links={socialLinksForRow} />
          ) : null}
          {resourceHref ? (
            <Link className="trustedResourceCard__viewLink" href={resourceHref} data-torp-card-interactive>
              View resource profile
            </Link>
          ) : null}
          {profilePath && einIdentityVerified && profilePath !== resourceHref ? (
            <Link className="trustedResourceCard__profileLink" href={profilePath} data-torp-card-interactive>
              Directory profile
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
