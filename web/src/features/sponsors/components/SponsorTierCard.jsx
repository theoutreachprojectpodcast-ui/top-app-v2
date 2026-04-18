import Link from "next/link";
import { formatUsd } from "@/features/sponsors/data/sponsorTiers";

export default function SponsorTierCard({ tier, selected, onSelect, variant = "main", interactive = true, compareHref = "/sponsors?packages=1" }) {
  const placements = tier.fullPlacements?.length ? tier.fullPlacements : tier.placements || [];
  const benefits = tier.fullBenefits || [];
  const combinedDetails = [...placements, ...benefits];
  const rootClass = variant === "podcast" ? "podcastSponsorTierCard" : "sponsorTierCard";
  return (
    <article className={`${rootClass} ${selected ? "isSelected" : ""}`}>
      <div className="sponsorTierCardTop">
        <p className="sponsorTierFamily">{tier.familyLabel}</p>
        <h4>{tier.name}</h4>
        {tier.subLabel ? <p className="sponsorTierSubLabel">{tier.subLabel}</p> : null}
        <p className="sponsorTierPrice">{formatUsd(tier.amount)}</p>
        <p className="sponsorTierTeaser">{tier.spotlight}</p>
      </div>

      <div className="sponsorTierCardGrow">
        {combinedDetails.length ? (
          <details className="sponsorTierDetails">
            <summary>View full placements &amp; benefits</summary>
            <ul className="sponsorBenefitList">
              {combinedDetails.map((item, i) => (
                <li key={`${tier.id}-d-${i}`}>{item}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      <div className="sponsorTierCardFooter">
        {interactive === false ? (
          <Link className="btnSoft" href={compareHref}>
            Compare tiers
          </Link>
        ) : (
          <button className={selected ? "btnPrimary" : "btnSoft"} type="button" onClick={() => onSelect(tier.id)}>
            {selected ? "Selected Tier" : "Select Tier"}
          </button>
        )}
      </div>
    </article>
  );
}
