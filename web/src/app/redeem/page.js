import LicenseRedeemForm from "@/features/bulkLicensing/LicenseRedeemForm";
import "@/features/bulkLicensing/bulkLicensing.css";

export const metadata = {
  title: "Redeem license — The Outreach Project",
};

export default async function RedeemPage({ searchParams }) {
  const sp = await searchParams;
  const code = String(sp?.code || "").trim();
  return (
    <main className="bulkLicensingPage">
      <header className="bulkLicensingPage__hero">
        <h1>Redeem a license</h1>
        <p>Enter the unique code from your organization administrator. Sign in first if prompted.</p>
      </header>
      <LicenseRedeemForm initialCode={code} />
    </main>
  );
}
