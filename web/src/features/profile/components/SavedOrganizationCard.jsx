"use client";

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
  const favoriteKey = einDigits.length === 9 ? einDigits : String(card.ein || card.id || "").trim();
  const location = unavailable ? "" : String(card.location || "").trim();

  function onFavoriteClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (favoriteKey && onToggleFavorite) onToggleFavorite(favoriteKey, card);
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
