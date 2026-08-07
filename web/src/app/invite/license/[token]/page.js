import LicenseRedeemForm from "@/features/bulkLicensing/LicenseRedeemForm";
import "@/features/bulkLicensing/bulkLicensing.css";

export const metadata = {
  title: "License invitation — The Outreach Project",
};

export default async function LicenseInvitePage({ params }) {
  const resolved = await params;
  const token = String(resolved?.token || "").trim();
  return (
    <main className="bulkLicensingPage">
      <header className="bulkLicensingPage__hero">
        <h1>Accept your invitation</h1>
        <p>Activate your Outreach membership seat from your organization.</p>
      </header>
      <LicenseRedeemForm inviteToken={token} />
    </main>
  );
}
