import SponsorTierCard from "@/features/sponsors/components/SponsorTierCard";

export default function SponsorTierComparison({
  tiers,
  selectedTierId,
  onSelectTier,
  title = "Sponsorship tiers",
  lead = "Compare packages at a glance. Open a tier for full placements and benefits.",
  variant = "main",
  familyTitle,
  familyDescription,
  interactive = true,
  compareHref = "/sponsors?packages=1",
}) {
  const list = Array.isArray(tiers) ? tiers : [];
  const gridClass = variant === "podcast" ? "podcastSponsorTierGrid" : "sponsorTierGrid";
  const showFamily = Boolean(familyTitle || familyDescription);

  const grid = (
    <div className={gridClass}>
      {list.map((tier) => (
        <SponsorTierCard
          key={tier.id}
          tier={tier}
          selected={selectedTierId === tier.id}
          onSelect={onSelectTier}
          variant={variant}
          interactive={interactive}
          compareHref={compareHref}
        />
      ))}
    </div>
  );

  return (
    <section className="card sponsorSection">
      <h3>{title}</h3>
      <p className="sponsorSectionLead">{lead}</p>

      {showFamily ? (
        <div className="sponsorFamilyBlock">
          {familyTitle ? <h4>{familyTitle}</h4> : null}
          {familyDescription ? <p className="sponsorSectionLead">{familyDescription}</p> : null}
          {grid}
        </div>
      ) : (
        grid
      )}
    </section>
  );
}
