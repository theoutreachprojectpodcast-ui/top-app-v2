"use client";

import Link from "next/link";
import NonprofitStatusBadge from "@/features/nonprofits/components/NonprofitStatusBadge";
import NonprofitVerificationBadge from "@/features/nonprofits/components/NonprofitVerificationBadge";
import NonprofitSocialLinks from "@/features/nonprofits/components/NonprofitSocialLinks";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { openExternalBrowserSheet } from "@/lib/capacitor/openExternalBrowserSheet";

export default function SavedOrganizationCard({ card, onToggleFavorite }) {
  const displayName = String(card?.name || "").trim() || "Saved organization";
  const einDigits = card.einNormalized?.length === 9 ? card.einNormalized : normalizeEinDigits(card.ein);
  const favoriteKey = String(card.ein || card.id || einDigits || "").trim();
  const profilePath = einDigits.length === 9 ? `/nonprofit/${einDigits}` : "";
  const location = String(card.location || "").trim();
  const websiteLink = Array.isArray(card.links) ? card.links.find((l) => l.type === "website") : null;

  function onFavoriteClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (favoriteKey && onToggleFavorite) onToggleFavorite(favoriteKey);
  }

  return (
    <details className="savedOrgCollapsible">
      <summary className="savedOrgCollapsible__summary">
        <span className="savedOrgCollapsible__summaryMain">
          <span className="savedOrgCollapsible__name">{displayName}</span>
          {location ? <span className="savedOrgCollapsible__location">{location}</span> : null}
        </span>
        {favoriteKey && onToggleFavorite ? (
          <button
            type="button"
            className="favBtn favBtn--on savedOrgCollapsible__fav"
            data-top-card-interactive
            onClick={onFavoriteClick}
            aria-pressed="true"
            aria-label={`Remove ${displayName} from saved`}
          >
            ★
          </button>
        ) : null}
      </summary>
      <div className="savedOrgCollapsible__body">
        <div className="nonprofitMetaRow">
          <NonprofitStatusBadge status={card.status} />
          <NonprofitVerificationBadge tier={card.tier} />
          {card.category?.label ? (
            <span className="nonprofitCategoryText" title={card.category.label}>
              {card.category.label}
            </span>
          ) : null}
        </div>
        {card.tagline ? <p className="nonprofitCardTagline">{card.tagline}</p> : null}
        {card.description ? <p className="nonprofitDescription">{card.description}</p> : null}
        <div className="savedOrgCollapsible__actions row wrap">
          {profilePath ? (
            <Link className="btnSoft" href={profilePath}>
              View profile
            </Link>
          ) : null}
          {websiteLink?.url ? (
            <button
              className="btnSoft"
              type="button"
              data-top-card-interactive
              onClick={(event) => {
                event.preventDefault();
                void openExternalBrowserSheet(websiteLink.url, { title: websiteLink.label || displayName });
              }}
            >
              Website
            </button>
          ) : null}
          {favoriteKey && onToggleFavorite ? (
            <button className="btnSoft" type="button" data-top-card-interactive onClick={onFavoriteClick}>
              Remove
            </button>
          ) : null}
        </div>
        <NonprofitSocialLinks links={card.links} />
      </div>
    </details>
  );
}
