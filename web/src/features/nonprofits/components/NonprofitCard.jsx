"use client";

import Link from "next/link";
import NonprofitCardMedia from "@/features/nonprofits/components/NonprofitCardMedia";
import NonprofitVerificationBadge from "@/features/nonprofits/components/NonprofitVerificationBadge";
import NonprofitStatusBadge from "@/features/nonprofits/components/NonprofitStatusBadge";
import NonprofitSocialLinks from "@/features/nonprofits/components/NonprofitSocialLinks";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";

export default function NonprofitCard({
  card,
  favoritesEnabled = false,
  isFavorite = false,
  onToggleFavorite,
  onRequestSignIn,
  actionMode = "directory",
}) {
  const favoriteKey = String(card.ein || card.id || "").trim();
  const isProvenCard = actionMode === "proven";
  const listingPhoto = String(card.heroImageUrl || card.thumbnailUrl || "").trim();
  const categoryKey = card.category?.key || "unknownGeneral";
  const einDigits =
    card.einNormalized?.length === 9 ? card.einNormalized : normalizeEinDigits(card.ein);
  const profilePath = einDigits.length === 9 ? `/nonprofit/${einDigits}` : "";
  const externalFallback = isProvenCard ? card.primaryLink : "";
  const useProfileLink = einDigits.length === 9 && card.einIdentityVerified !== false;
  const activationTarget = profilePath || externalFallback;

  const socialOnlyLinks = card.links.filter((l) => l.type !== "website");

  function onCardActivate() {
    if (profilePath) {
      if (typeof window !== "undefined") window.location.assign(profilePath);
      return;
    }
    if (externalFallback) window.open(externalFallback, "_blank", "noopener,noreferrer");
  }

  function onCardClick(event) {
    if (!activationTarget || useProfileLink) return;
    const interactiveTarget = event.target?.closest?.(
      "a,button,input,select,textarea,label,[data-torp-card-interactive]"
    );
    if (interactiveTarget) return;
    onCardActivate();
  }

  function onCardKeyDown(event) {
    if (!activationTarget || useProfileLink) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onCardActivate();
    }
  }

  function onFavoriteClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (favoriteKey && onToggleFavorite) onToggleFavorite(favoriteKey);
  }

  function onGuestFavoriteClick(event) {
    event.preventDefault();
    event.stopPropagation();
    onRequestSignIn?.();
  }

  const metaRow = (
    <div className={`nonprofitMetaRow${isProvenCard ? " nonprofitMetaRow--proven" : ""}`}>
      <NonprofitStatusBadge status={card.status} />
      {!isProvenCard && <NonprofitVerificationBadge tier={card.tier} />}
      <span className="nonprofitCategoryText" title={card.category?.label}>
        {card.category?.label || "General Nonprofit"}
      </span>
    </div>
  );

  const bodyBlock = (
    <>
      <div className="nonprofitTitleRow">
        <span className="nonprofitOrgName">{card.name}</span>
        {favoritesEnabled && !!favoriteKey && onToggleFavorite ? (
          <button
            className={`favBtn${isFavorite ? " favBtn--on" : ""}`}
            type="button"
            data-torp-card-interactive
            onClick={onFavoriteClick}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Remove from saved" : "Save organization"}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        ) : null}
        {!favoritesEnabled && onRequestSignIn && !!favoriteKey ? (
          <button
            className="favBtn favBtn--muted"
            type="button"
            data-torp-card-interactive
            onClick={onGuestFavoriteClick}
            aria-label="Sign in to save organizations"
          >
            ☆
          </button>
        ) : null}
      </div>
      {metaRow}
      {!!card.nonprofitType && card.nonprofitType !== card.category?.label ? (
        <p className="nonprofitTypeLine">{card.nonprofitType}</p>
      ) : null}
      <p className="nonprofitLocation">{card.location}</p>
      {!isProvenCard && !!card.tagline && String(card.tagline).trim() !== String(card.description || "").trim() ? (
        <p className="nonprofitCardTagline">{card.tagline}</p>
      ) : null}
      {!!card.description && <p className="nonprofitDescription">{card.description}</p>}
    </>
  );

  const actionRow = (
    <div className="nonprofitActionRow nonprofitActionRow--cardFooter" data-torp-card-interactive>
      {actionMode === "directory" && (
        <a
          className="btnBlack btnBlack--findInfo"
          data-torp-card-interactive
          href={card.findInfoHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          Find Info
        </a>
      )}
      {actionMode === "saved" && !!favoriteKey && onToggleFavorite && (
        <button className="btnSoft" type="button" data-torp-card-interactive onClick={onFavoriteClick}>
          Unfavorite
        </button>
      )}
      {actionMode === "directory"
        ? card.links
            .filter((l) => l.type === "website")
            .map((l) => (
              <a
                key={l.url}
                className="btnSoft"
                data-torp-card-interactive
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Website
              </a>
            ))
        : null}
      {actionMode === "directory" && socialOnlyLinks.length > 0 ? (
        <NonprofitSocialLinks links={socialOnlyLinks} />
      ) : null}
      {actionMode !== "directory" ? <NonprofitSocialLinks links={card.links} /> : null}
    </div>
  );

  return (
    <article
      className={`resultCard torpListingCard tier-${card.tier} category-${categoryKey} resultCard--listingHero ${activationTarget ? "resultCard--clickable" : ""} ${isProvenCard ? "resultCard--proven" : ""} ${useProfileLink ? "resultCard--profileLink" : ""}`}
      onClick={useProfileLink ? undefined : onCardClick}
      onKeyDown={useProfileLink ? undefined : onCardKeyDown}
      role={activationTarget && !useProfileLink ? "link" : undefined}
      tabIndex={activationTarget && !useProfileLink ? 0 : undefined}
      aria-label={activationTarget && !useProfileLink ? `View profile: ${card.name}` : undefined}
    >
      <div className="torpListingCardHeroWrap" aria-hidden>
        <div
          className={`torpListingCardHero ${listingPhoto ? "torpListingCardHero--photo" : "torpListingCardHero--category"}`}
          data-torp-listing-category={categoryKey}
          style={listingPhoto ? { backgroundImage: `url(${JSON.stringify(listingPhoto)})` } : undefined}
        />
        <div className="torpListingCardHeroScrim torpListingCardHeroScrim--resource" />
      </div>
      <div className="torpListingCardBody">
        <div
          className={`nonprofitCardMain${isProvenCard ? " nonprofitCardMain--proven" : " nonprofitCardMain--directoryBalance"}${useProfileLink ? " nonprofitCardMain--hitStack" : ""}`}
        >
          {useProfileLink ? (
            <Link
              href={profilePath}
              className="nonprofitCardHitLayer"
              aria-label={`View profile: ${card.name}`}
            />
          ) : null}
          <div className="nonprofitCardMediaSlot">
            <NonprofitCardMedia
              category={card.category}
              tier={card.tier}
              logoUrl={card.logoUrl}
              layout={isProvenCard ? "proven" : "default"}
            />
          </div>
          <div className={`nonprofitContentCol${isProvenCard ? " nonprofitContentCol--proven" : " nonprofitContentCol--directory"}`}>
            {bodyBlock}
          </div>
        </div>
        {actionRow}
      </div>
    </article>
  );
}
