"use client";

import Link from "next/link";
import NonprofitCard from "@/features/nonprofits/components/NonprofitCard";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { ORGANIZATION_UNAVAILABLE_LABEL } from "@/lib/savedOrganizations/savedOrganizationLabels";

export default function SavedOrganizationCard({ card, onToggleFavorite }) {
  const unavailable =
    card?.savedResolutionStatus === "unavailable" ||
    card?.organizationUnavailable === true ||
    !String(card?.name || "").trim();
  const displayName = unavailable
    ? ORGANIZATION_UNAVAILABLE_LABEL
    : String(card?.name || "").trim();
  const einDigits = card.einNormalized?.length === 9 ? card.einNormalized : normalizeEinDigits(card.ein);
  const entityKey = String(card?.entityKey || "").trim();
  const favoriteKey =
    einDigits.length === 9 ? einDigits : entityKey || String(card.ein || card.id || "").trim();
  const location = unavailable ? "" : String(card.location || "").trim();
  const trustedSlug = String(card?.trustedResourceSlug || "").trim().toLowerCase();
  const detailPath =
    String(card?.detailPath || "").trim() ||
    (trustedSlug ? `/trusted/${trustedSlug}` : einDigits.length === 9 ? `/nonprofit/${einDigits}` : "");

  function onFavoriteClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!favoriteKey || !onToggleFavorite) return;
    onToggleFavorite(favoriteKey, card);
  }

  return (
    <details className={`savedOrgCollapsible${unavailable ? " savedOrgCollapsible--unavailable" : ""}`}>
      <summary className="savedOrgCollapsible__summary">
        <span className="savedOrgCollapsible__summaryMain">
          <span className="savedOrgCollapsible__name">{displayName}</span>
          {location ? <span className="savedOrgCollapsible__location">{location}</span> : null}
          {unavailable ? (
            <span className="savedOrgCollapsible__unavailableHint">This organization is no longer available</span>
          ) : null}
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
      <div className="savedOrgCollapsible__body savedOrgCollapsible__body--card">
        {unavailable ? (
          <p className="sponsorSectionLead savedOrgCollapsible__unavailableBody">
            This saved organization could not be matched to a current directory record. You can remove it from your
            saved list.
          </p>
        ) : entityKey || trustedSlug ? (
          <div className="savedOrgCollapsible__trusted">
            <p className="sponsorSectionLead">{card.shortDescription || "Trusted Resource"}</p>
            {detailPath ? (
              <Link className="btnSoft" href={detailPath}>
                View organization
              </Link>
            ) : null}
          </div>
        ) : (
          <NonprofitCard
            card={card}
            actionMode="directory"
            favoritesEnabled={true}
            isFavorite={true}
            onToggleFavorite={onToggleFavorite}
          />
        )}
      </div>
    </details>
  );
}
