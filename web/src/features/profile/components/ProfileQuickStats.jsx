export default function ProfileQuickStats({ savedCount, membershipLabel }) {
  return (
    <div className="card">
      <h3>At a glance</h3>
      <div className="row space wrap">
        <p>
          <strong>{savedCount}</strong> saved {savedCount === 1 ? "organization" : "organizations"}
        </p>
        <p>
          Status: <strong>{membershipLabel || "Supporter"}</strong>
        </p>
      </div>
    </div>
  );
}
