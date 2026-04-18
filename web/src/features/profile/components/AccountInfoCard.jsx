function sourceLabel(source) {
  if (source === "cloud") return "Cloud (WorkOS + Supabase)";
  if (source === "supabase") return "Supabase (demo sync)";
  return "This device only";
}

function formatMembershipSource(src) {
  const s = String(src || "manual").toLowerCase();
  if (s === "stripe") return "Stripe (subscription)";
  if (s === "onboarding") return "Onboarding";
  return "Manual / free";
}

export default function AccountInfoCard({
  firstName,
  lastName,
  email,
  profileSource = "local",
  membershipTier = "",
  membershipBillingStatus = "",
  membershipSource = "",
  podcastSponsorLastTierId = "",
  podcastSponsorLastCheckoutAt = "",
  displayName = "",
  manageBillingSlot = null,
}) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || displayName;
  const sponsorLine =
    podcastSponsorLastTierId || podcastSponsorLastCheckoutAt
      ? `Last podcast sponsor checkout${podcastSponsorLastTierId ? ` (${podcastSponsorLastTierId})` : ""}${
          podcastSponsorLastCheckoutAt ? ` — ${new Date(podcastSponsorLastCheckoutAt).toLocaleString()}` : ""
        }`
      : "";

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
        <strong>Membership</strong>
        <br />
        {membershipTier ? String(membershipTier) : "—"}
      </p>
      <p>
        <strong>Billing status</strong>
        <br />
        {membershipBillingStatus ? String(membershipBillingStatus) : "—"}
      </p>
      <p>
        <strong>Membership source</strong>
        <br />
        {formatMembershipSource(membershipSource)}
      </p>
      {sponsorLine ? (
        <p>
          <strong>Sponsor activity</strong>
          <br />
          {sponsorLine}
        </p>
      ) : null}
      <p>
        <strong>Profile data source</strong>
        <br />
        {sourceLabel(profileSource)}
      </p>
      {manageBillingSlot ? <div style={{ marginTop: 12 }}>{manageBillingSlot}</div> : null}
    </div>
  );
}
