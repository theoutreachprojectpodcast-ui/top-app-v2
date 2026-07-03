"use client";

import Link from "next/link";
import NonprofitCardMedia from "@/features/nonprofits/components/NonprofitCardMedia";
import NonprofitVerificationBadge from "@/features/nonprofits/components/NonprofitVerificationBadge";
import NonprofitStatusBadge from "@/features/nonprofits/components/NonprofitStatusBadge";
import NonprofitSocialLinks from "@/features/nonprofits/components/NonprofitSocialLinks";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { openExternalBrowserSheet } from "@/lib/capacitor/openExternalBrowserSheet";

export default function NonprofitCard({
  card,
  favoritesEnabled = false,
  isFavorite = false,
  onToggleFavorite,
  onRequestSignIn,
  actionMode = "directory",
}) {
  const favoriteKey = String(card.ein || card.id || "").trim();
  const isDirectory = actionMode === "directory";
  const isTrustedResourcesCard = actionMode === "trustedResource";
  const listingPhoto = isTrustedResourcesCard
    ? String(card.heroImageUrl || "").trim()
    : String(card.heroImageUrl || card.thumbnailUrl || "").trim();
  const categoryKey = card.category?.key || "unknownGeneral";
  const einDigits =
    card.einNormalized?.length === 9 ? card.einNormalized : normalizeEinDigits(card.ein);
  const profilePath = einDigits.length === 9 ? `/nonprofit/${einDigits}` : "";
  const externalFallback = isTrustedResourcesCard ? card.primaryLink : "";
  const useProfileLink =
    !isDirectory && einDigits.length === 9 && card.einIdentityVerified !== false;
  const activationTarget = isDirectory ? "" : profilePath || externalFallback;

  function onCardActivate() {
    if (isDirectory) return;
    if (profilePath) {
      if (typeof window !== "undefined") window.location.assign(profilePath);
      return;
    }
    if (externalFallback) window.open(externalFallback, "_blank", "noopener,noreferrer");
  }

  function onCardClick(event) {
    if (isDirectory || !activationTarget || useProfileLink) return;
    const interactiveTarget = event.target?.closest?.(
      "a,button,input,select,textarea,label,[data-top-card-interactive]"
    );
    if (interactiveTarget) return;
    onCardActivate();
  }

  function onCardKeyDown(event) {
    if (isDirectory || !activationTarget || useProfileLink) return;
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

  function onFindInfoClick(event) {
    event.preventDefault();
    event.stopPropagation();
    const href = String(card.findInfoHref || "").trim();
    if (!href) return;
    void openExternalBrowserSheet(href, { title: card.name || "Find Info" });
  }

  const metaRow = (
    <div className={`nonprofitMetaRow${isTrustedResourcesCard ? " nonprofitMetaRow--trustedResource" : ""}`}>
      <NonprofitStatusBadge status={card.status} />
      {!isTrustedResourcesCard && <NonprofitVerificationBadge tier={card.tier} />}
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
            data-top-card-interactive
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
            data-top-card-interactive
            onClick={onGuestFavoriteClick}
            aria-label="Sign in to save organizations"
          >
            ☆
          </button>
        ) : null}
      </div>
      {metaRow}
      {!!card.cardSubheader ? <p className="nonprofitCardSubheader">{card.cardSubheader}</p> : null}
      {!!card.nonprofitType && card.nonprofitType !== card.category?.label ? (
        <p className="nonprofitTypeLine">{card.nonprofitType}</p>
      ) : null}
      <p className="nonprofitLocation">{card.location}</p>
      {!isTrustedResourcesCard && !!card.tagline && String(card.tagline).trim() !== String(card.description || "").trim() ? (
        <p className="nonprofitCardTagline">{card.tagline}</p>
      ) : null}
      {!!card.description && <p className="nonprofitDescription">{card.description}</p>}
    </>
  );

  const actionRow = (
    <div className="nonprofitActionRow nonprofitActionRow--cardFooter" data-top-card-interactive>
      {actionMode === "directory" && (
        <button
          className="btnBlack btnBlack--findInfo"
          type="button"
          data-top-card-interactive
          onClick={onFindInfoClick}
        >
          Find Info
        </button>
      )}
      {actionMode === "saved"
        ? card.links
            .filter((l) => l.type === "website")
            .map((l) => (
              <button
                key={l.url}
                className="btnSoft"
                type="button"
                data-top-card-interactive
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void openExternalBrowserSheet(l.url, { title: l.label || card.name || "Website" });
                }}
              >
                Website
              </button>
            ))
        : null}
      {actionMode === "saved" && !!favoriteKey && onToggleFavorite && (
        <button className="btnSoft" type="button" data-top-card-interactive onClick={onFavoriteClick}>
          Unfavorite
        </button>
      )}
      {actionMode !== "directory" ? <NonprofitSocialLinks links={card.links} /> : null}
    </div>
  );

  return (
    <article
      className={`resultCard topListingCard tier-${card.tier} category-${categoryKey} resultCard--listingHero ${!isDirectory && activationTarget ? "resultCard--clickable" : ""} ${isDirectory ? "resultCard--directoryListing" : ""} ${isTrustedResourcesCard ? "resultCard--trustedResource" : ""} ${useProfileLink ? "resultCard--profileLink" : ""}`}
      onClick={useProfileLink ? undefined : onCardClick}
      onKeyDown={useProfileLink ? undefined : onCardKeyDown}
      role={activationTarget && !useProfileLink ? "link" : undefined}
      tabIndex={activationTarget && !useProfileLink ? 0 : undefined}
      aria-label={activationTarget && !useProfileLink ? `View profile: ${card.name}` : undefined}
    >
      <div className="topListingCardHeroWrap" aria-hidden>
        <div
          className={`topListingCardHero ${listingPhoto ? "topListingCardHero--photo" : "topListingCardHero--category"}`}
          data-top-listing-category={categoryKey}
          style={listingPhoto ? { backgroundImage: `url(${JSON.stringify(listingPhoto)})` } : undefined}
        />
        <div className="topListingCardHeroScrim topListingCardHeroScrim--resource topListingCardHeroScrim--orgListing" />
      </div>
      <div className="topListingCardBody">
        <div
          className={`nonprofitCardMain${isTrustedResourcesCard ? " nonprofitCardMain--trustedResource" : " nonprofitCardMain--directoryBalance"}${useProfileLink ? " nonprofitCardMain--hitStack" : ""}`}
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
              name={card.name}
              entityKey={card.trustedResourceSlug || card.ein || card.id}
              layout={isTrustedResourcesCard ? "trustedResource" : "default"}
            />
          </div>
          <div className={`nonprofitContentCol${isTrustedResourcesCard ? " nonprofitContentCol--trustedResource" : " nonprofitContentCol--directory"}`}>
            {bodyBlock}
          </div>
        </div>
        {actionRow}
      </div>
    </article>
  );
}
