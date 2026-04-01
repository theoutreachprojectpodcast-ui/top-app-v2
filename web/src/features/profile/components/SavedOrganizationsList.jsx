import { rowCity, rowEin, rowName, rowState } from "@/lib/utils";

export default function SavedOrganizationsList({ organizations, onToggleFavorite }) {
  return (
    <div className="card">
      <h3>Saved Organizations</h3>
      {!organizations.length ? (
        <p>No saved organizations yet. Star an organization from Directory or Proven Allies.</p>
      ) : (
        <div className="results">
          {organizations.map((org) => (
            <article className="resultCard" key={`saved-${rowEin(org)}-${rowName(org)}`}>
              <div className="row space">
                <div>
                  <strong>{rowName(org)}</strong>
                  <p>{[rowCity(org), rowState(org)].filter(Boolean).join(", ") || "Location not listed"}</p>
                </div>
                {!!rowEin(org) && (
                  <button className="btnSoft" type="button" onClick={() => onToggleFavorite(rowEin(org))}>
                    Unfavorite
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
