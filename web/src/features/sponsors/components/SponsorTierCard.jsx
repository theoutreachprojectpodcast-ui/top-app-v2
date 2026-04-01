import { formatUsd } from "@/features/sponsors/data/sponsorTiers";

export default function SponsorTierCard({ tier, selected, onSelect }) {
  return (
    <article className={`sponsorTierCard ${selected ? "isSelected" : ""}`}>
      <p className="sponsorTierFamily">{tier.familyLabel}</p>
      <h4>{tier.name}</h4>
      {tier.subLabel ? <p className="sponsorTierSubLabel">{tier.subLabel}</p> : null}
      <p className="sponsorTierPrice">{formatUsd(tier.amount)}</p>
      <p className="sponsorTierSpotlight">{tier.spotlight}</p>
      <ul className="sponsorBenefitList">
        {tier.placements.map((item) => (
          <li key={`${tier.id}-${item}`}>{item}</li>
        ))}
      </ul>
      <button className={selected ? "btnPrimary" : "btnSoft"} type="button" onClick={() => onSelect(tier.id)}>
        {selected ? "Selected Tier" : "Select Tier"}
      </button>
    </article>
  );
}
