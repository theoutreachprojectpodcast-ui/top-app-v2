import NonprofitCardMedia from "@/features/nonprofits/components/NonprofitCardMedia";
import NonprofitVerificationBadge from "@/features/nonprofits/components/NonprofitVerificationBadge";
import NonprofitStatusBadge from "@/features/nonprofits/components/NonprofitStatusBadge";
import NonprofitSocialLinks from "@/features/nonprofits/components/NonprofitSocialLinks";

export default function NonprofitCard({
  card,
  isMember = false,
  isFavorite = false,
  onToggleFavorite,
  actionMode = "directory",
}) {
  const favoriteKey = String(card.ein || card.id || "").trim();
  const isProvenCard = actionMode === "proven";
  const clickableUrl = isProvenCard ? card.primaryLink : "";

  function onCardActivate() {
    if (!clickableUrl) return;
    window.open(clickableUrl, "_blank", "noopener,noreferrer");
  }

  function onCardClick(event) {
    if (!clickableUrl) return;
    const interactiveTarget = event.target?.closest?.("a,button,input,select,textarea,label");
    if (interactiveTarget) return;
    onCardActivate();
  }

  function onCardKeyDown(event) {
    if (!clickableUrl) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onCardActivate();
    }
  }

  return (
    <article
      className={`resultCard tier-${card.tier} category-${card.category?.key || "unknownGeneral"} ${clickableUrl ? "resultCard--clickable" : ""}`}
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
      role={clickableUrl ? "link" : undefined}
      tabIndex={clickableUrl ? 0 : undefined}
      aria-label={clickableUrl ? `Open ${card.name} profile` : undefined}
    >
      <div className="nonprofitCardMain">
        <NonprofitCardMedia
          category={card.category}
          tier={card.tier}
        />
        <div className="nonprofitContentCol">
          <div className="nonprofitTitleRow">
            <strong>{card.name}</strong>
            {isMember && !!favoriteKey && onToggleFavorite && (
              <button className="favBtn" onClick={() => onToggleFavorite(favoriteKey)} type="button">
                {isFavorite ? "★" : "☆"}
              </button>
            )}
          </div>
          <div className="nonprofitMetaRow">
            <NonprofitStatusBadge status={card.status} />
            {!isProvenCard && <NonprofitVerificationBadge tier={card.tier} />}
            <span className="nonprofitCategoryLabel">{card.category.label}</span>
          </div>
          <p className="nonprofitLocation">{card.location}</p>
          {!!card.description && <p className="nonprofitDescription">{card.description}</p>}
          <div className="nonprofitActionRow">
            {actionMode === "directory" && (
              <a
                className="btnBlack"
                href={`https://www.google.com/search?q=${encodeURIComponent(`${card.name} ${card.city} ${card.state} nonprofit`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Find Info
              </a>
            )}
            {actionMode === "saved" && !!favoriteKey && onToggleFavorite && (
              <button className="btnSoft" type="button" onClick={() => onToggleFavorite(favoriteKey)}>Unfavorite</button>
            )}
            {actionMode === "directory" ? (
              card.links
                .filter((l) => l.type === "website")
                .map((l) => (
                  <a key={l.url} className="btnSoft" href={l.url} target="_blank" rel="noopener noreferrer">Website</a>
                ))
            ) : (
              <NonprofitSocialLinks links={card.links} />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

