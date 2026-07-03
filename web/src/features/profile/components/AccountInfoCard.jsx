import { formatMembershipBillingStatus } from "@/features/membership/membershipAccountDisplay";

export default function AccountInfoCard({
  firstName,
  lastName,
  email = "",
  sessionEmail = "",
  membershipTier = "",
  membershipBillingStatus = "",
  podcastSponsorLastTierId = "",
  podcastSponsorLastCheckoutAt = "",
  displayName = "",
  manageBillingSlot = null,
}) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || displayName;
  const emailLine = String(email || "").trim() || String(sessionEmail || "").trim();
  const billingLine = formatMembershipBillingStatus(membershipBillingStatus);
  const sponsorLine =
    podcastSponsorLastTierId || podcastSponsorLastCheckoutAt
      ? `Last podcast sponsor checkout${podcastSponsorLastTierId ? ` (${podcastSponsorLastTierId})` : ""}${
          podcastSponsorLastCheckoutAt ? ` — ${new Date(podcastSponsorLastCheckoutAt).toLocaleString()}` : ""
        }`
      : "";

  return (
    <div className="card accountInfoCard">
      <h3>Account</h3>
      <p>
        <strong>Name</strong>
        <br />
        {name || "—"}
      </p>
      <p>
        <strong>Email</strong>
        <br />
        {emailLine || "—"}
      </p>
      <p>
        <strong>Membership</strong>
        <br />
        {membershipTier ? String(membershipTier) : "—"}
      </p>
      <p>
        <strong>Billing status</strong>
        <br />
        {billingLine}
      </p>
      {sponsorLine ? (
        <p>
          <strong>Sponsor activity</strong>
          <br />
          {sponsorLine}
        </p>
      ) : null}
      {manageBillingSlot ? <div className="accountInfoCard__billing">{manageBillingSlot}</div> : null}
    </div>
  );
}
