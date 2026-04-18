export default function ProfileQuickStats({ savedCount }) {
  return (
    <div className="card">
      <h3>At a glance</h3>
      <div className="row space wrap">
        <p>
          <strong>{savedCount}</strong> saved {savedCount === 1 ? "organization" : "organizations"}
        </p>
      </div>
    </div>
  );
}
