import { formatUsd } from "@/features/sponsors/data/sponsorTiers";

export default function SponsorTierCard({ tier, selected, onSelect }) {
  const placements = tier.placements || [];
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
        {placements.length ? (
          <details className="sponsorTierDetails">
            <summary>View Full Placements</summary>
            <ul className="sponsorBenefitList">
              {placements.map((item) => (
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
