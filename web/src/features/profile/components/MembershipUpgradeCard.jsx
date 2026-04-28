export default function MembershipUpgradeCard({ isMember, membershipLabel, membershipHint, onUpgrade }) {
  if (isMember) {
    return (
      <div className="card">
        <h3>Membership</h3>
        <p>
          <strong>{membershipLabel || "Pro Membership"}</strong>
        </p>
        <p>{membershipHint || "You have full member access to sponsors, community, and saved organizations."}</p>
      </div>
    );
  }
  return (
    <div className="card">
      <h3>Upgrade to Member</h3>
      <p>{membershipHint || "Unlock sponsor benefits, community stories, and saved nonprofit lists."}</p>
      <div className="row wrap">
        <button type="button" className="btnPrimary" onClick={onUpgrade}>
          View membership options
        </button>
      </div>
    </div>
  );
}
