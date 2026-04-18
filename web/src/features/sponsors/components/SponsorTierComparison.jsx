import SponsorTierCard from "@/features/sponsors/components/SponsorTierCard";
import { SPONSOR_FAMILY, SPONSOR_FAMILY_COPY, SPONSOR_TIERS } from "@/features/sponsors/data/sponsorTiers";

export default function SponsorTierComparison({ selectedTierId, onSelectTier }) {
  const support = SPONSOR_TIERS.filter((tier) => tier.family === SPONSOR_FAMILY.SUPPORT);
  const integrated = SPONSOR_TIERS.filter((tier) => tier.family === SPONSOR_FAMILY.INTEGRATED);

  return (
    <section className="card sponsorSection">
      <h3>Sponsorship Tiers</h3>
      <p className="sponsorSectionLead">Compare quickly, then expand details only when needed.</p>

      <div className="sponsorFamilyBlock">
        <h4>Support Sponsor Tiers</h4>
        <p>{SPONSOR_FAMILY_COPY[SPONSOR_FAMILY.SUPPORT]}</p>
        <div className="sponsorTierGrid">
          {support.map((tier) => (
            <SponsorTierCard
              key={tier.id}
              tier={tier}
              selected={selectedTierId === tier.id}
              onSelect={onSelectTier}
            />
          ))}
        </div>
      </div>

      <div className="sponsorFamilyBlock">
        <h4>Integrated Sponsorship Tiers</h4>
        <p>{SPONSOR_FAMILY_COPY[SPONSOR_FAMILY.INTEGRATED]}</p>
        <div className="sponsorTierGrid">
          {integrated.map((tier) => (
            <SponsorTierCard
              key={tier.id}
              tier={tier}
              selected={selectedTierId === tier.id}
              onSelect={onSelectTier}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
