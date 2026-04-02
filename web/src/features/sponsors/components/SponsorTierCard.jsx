import { formatUsd } from "@/features/sponsors/data/sponsorTiers";

export default function SponsorTierCard({ tier, selected, onSelect }) {
  const topPlacements = (tier.placements || []).slice(0, 3);
  const extraPlacements = (tier.placements || []).slice(3);
  return (
    <article className={`sponsorTierCard ${selected ? "isSelected" : ""}`}>
      <div className="sponsorTierCardTop">
        <p className="sponsorTierFamily">{tier.familyLabel}</p>
        <h4>{tier.name}</h4>
        {tier.subLabel ? <p className="sponsorTierSubLabel">{tier.subLabel}</p> : null}
        <p className="sponsorTierPrice">{formatUsd(tier.amount)}</p>
        <p className="sponsorTierTeaser">{tier.spotlight}</p>
      </div>

      <div className="sponsorTierCardGrow">
        <ul className="sponsorBenefitList">
          {topPlacements.map((item) => (
            <li key={`${tier.id}-${item}`}>{item}</li>
          ))}
        </ul>
        {extraPlacements.length ? (
          <details className="sponsorTierDetails">
            <summary>View full placements</summary>
            <ul className="sponsorBenefitList">
              {extraPlacements.map((item) => (
                <li key={`${tier.id}-extra-${item}`}>{item}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      <div className="sponsorTierCardFooter">
        <button className={selected ? "btnPrimary" : "btnSoft"} type="button" onClick={() => onSelect(tier.id)}>
          {selected ? "Selected Tier" : "Select Tier"}
        </button>
      </div>
    </article>
  );
}
