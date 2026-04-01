export default function MembershipBadge({ isMember, icon, label }) {
  return (
    <div className={`membershipBadge ${isMember ? "isMember" : "isSupporter"}`}>
      {icon}
      {label}
    </div>
  );
}

