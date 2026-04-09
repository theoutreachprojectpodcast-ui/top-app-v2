function sourceLabel(source) {
  if (source === "cloud") return "Cloud (WorkOS + Supabase)";
  if (source === "supabase") return "Supabase (demo sync)";
  return "This device only";
}

export default function AccountInfoCard({
  firstName,
  lastName,
  email,
  profileSource = "local",
  membershipTier = "",
  membershipBillingStatus = "",
  displayName = "",
}) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || displayName;
  return (
    <div className="card">
      <h3>Account</h3>
      <p>
        <strong>Name</strong>
        <br />
        {name || "—"}
      </p>
      <p>
        <strong>Email</strong>
        <br />
        {email || "—"}
      </p>
      <p>
        <strong>Membership tier</strong>
        <br />
        {membershipTier ? String(membershipTier) : "—"}
      </p>
      <p>
        <strong>Billing status</strong>
        <br />
        {membershipBillingStatus ? String(membershipBillingStatus) : "—"}
      </p>
      <p style={{ marginBottom: 0 }}>
        <strong>Profile data source</strong>
        <br />
        {sourceLabel(profileSource)}
      </p>
    </div>
  );
}
