"use client";

import NonprofitCard from "@/features/nonprofits/components/NonprofitCard";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";

export default function SavedOrganizationCard({ card, onToggleFavorite }) {
  const displayName = String(card?.name || "").trim() || "Saved organization";
  const einDigits = card.einNormalized?.length === 9 ? card.einNormalized : normalizeEinDigits(card.ein);
  const favoriteKey = String(card.ein || card.id || einDigits || "").trim();
  const location = String(card.location || "").trim();

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
      <div className="savedOrgCollapsible__body savedOrgCollapsible__body--card">
        <NonprofitCard
          card={card}
          actionMode="directory"
          favoritesEnabled={true}
          isFavorite={true}
          onToggleFavorite={onToggleFavorite}
        />
      </div>
    </details>
  );
}
