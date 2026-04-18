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
  const sectionClass =
    variant === "podcast" ? "podcastSponsorFlowModal__tierBlock" : "card sponsorSection";
  const titleClass = variant === "podcast" ? "podcastSponsorFlowModal__blockTitle" : undefined;
  const leadClass = variant === "podcast" ? "podcastSponsorFlowModal__blockLead" : "sponsorSectionLead";
  const familyTitleClass = variant === "podcast" ? "podcastSponsorFlowModal__familyTitle" : undefined;
  const familyDescClass = variant === "podcast" ? "podcastSponsorFlowModal__blockLead" : "sponsorSectionLead";

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
    <section className={sectionClass}>
      <h3 className={titleClass}>{title}</h3>
      <p className={leadClass}>{lead}</p>

      {showFamily ? (
        <div className="sponsorFamilyBlock">
          {familyTitle ? <h4 className={familyTitleClass}>{familyTitle}</h4> : null}
          {familyDescription ? <p className={familyDescClass}>{familyDescription}</p> : null}
          {grid}
        </div>
      ) : (
        grid
      )}
    </section>
  );
}
