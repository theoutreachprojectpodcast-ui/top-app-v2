import NonprofitCardMedia from "@/features/nonprofits/components/NonprofitCardMedia";
import NonprofitVerificationBadge from "@/features/nonprofits/components/NonprofitVerificationBadge";
import NonprofitSocialLinks from "@/features/nonprofits/components/NonprofitSocialLinks";

export default function NonprofitCard({
  card,
  isMember = false,
  isFavorite = false,
  onToggleFavorite,
  actionMode = "directory",
}) {
  return (
    <article className={`resultCard tier-${card.tier}`}>
      <div className="nonprofitCardMain">
        <NonprofitCardMedia
          category={card.category.key}
          categoryLabel={card.category.label}
          tier={card.tier}
          iconTint={card.category.iconTint}
        />
        <div className="nonprofitContentCol">
          <div className="nonprofitTitleRow">
            <strong>{card.name}</strong>
            {isMember && !!card.ein && onToggleFavorite && (
              <button className="favBtn" onClick={() => onToggleFavorite(card.ein)} type="button">
                {isFavorite ? "★" : "☆"}
              </button>
            )}
          </div>
          <div className="nonprofitMetaRow">
            <NonprofitVerificationBadge tier={card.tier} />
            <span className="nonprofitCategoryLabel" style={{ color: card.category.iconColor }}>{card.category.label}</span>
          </div>
          <p className="nonprofitLocation">{card.location}</p>
          <p className="nonprofitDescription">{card.description}</p>
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
            {actionMode === "saved" && !!card.ein && onToggleFavorite && (
              <button className="btnSoft" type="button" onClick={() => onToggleFavorite(card.ein)}>Unfavorite</button>
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

