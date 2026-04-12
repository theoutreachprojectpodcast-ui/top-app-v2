import SavedOrganizationCard from "@/features/profile/components/SavedOrganizationCard";

export default function SavedOrganizationsList({ organizations, savedEinCount = 0, onToggleFavorite }) {
  return (
    <div className="card">
      <h3>Saved Organizations</h3>
      {!organizations.length ? (
        savedEinCount > 0 ? (
          <p className="sponsorSectionLead">Loading saved organization details…</p>
        ) : (
          <p>No saved organizations yet. Star an organization from Directory or Trusted Resources.</p>
        )
      ) : (
        <div className="results">
          {organizations.map((card) => (
            <SavedOrganizationCard
              key={`saved-${String(card?.einNormalized || card?.ein || "")}-${String(card?.name || "")}`}
              card={card}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
