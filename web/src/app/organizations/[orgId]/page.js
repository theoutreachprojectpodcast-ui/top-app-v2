import OrganizationLicenseDashboard from "@/features/bulkLicensing/OrganizationLicenseDashboard";
import "@/features/bulkLicensing/bulkLicensing.css";

export const metadata = {
  title: "Organization licenses — The Outreach Project",
};

export default async function OrganizationPage({ params }) {
  const resolved = await params;
  const orgId = String(resolved?.orgId || "").trim();
  return (
    <main className="bulkLicensingPage">
      <OrganizationLicenseDashboard orgId={orgId} />
    </main>
  );
}
