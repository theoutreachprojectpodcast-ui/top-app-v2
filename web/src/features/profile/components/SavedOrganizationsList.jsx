import SavedOrganizationCard from "@/features/profile/components/SavedOrganizationCard";

export default function SavedOrganizationsList({ organizations, onToggleFavorite }) {
  return (
    <div className="card">
      <h3>Saved Organizations</h3>
      {!organizations.length ? (
        <p>No saved organizations yet. Star an organization from Directory or Trusted Resources.</p>
      ) : (
        <div className="results">
          {organizations.map((org) => (
            <SavedOrganizationCard
              key={`saved-${String(org?.ein || org?.EIN || "")}-${String(org?.orgName || org?.name || "")}`}
              organization={org}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
