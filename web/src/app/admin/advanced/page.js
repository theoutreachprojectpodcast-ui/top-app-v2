import Link from "next/link";
import AdminStatusPanel from "@/features/admin/AdminStatusPanel";
import AdminPanelShell from "@/components/admin/AdminPanelShell";
import AdminAdvancedSettings from "@/components/admin/AdminAdvancedSettings";

const ADVANCED_LINKS = [
  { href: "/admin/settings", label: "Site settings" },
  { href: "/admin/forms", label: "Form submissions" },
  { href: "/admin/applications", label: "Partner activity" },
  { href: "/admin/contact", label: "Contact inbox" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/membership", label: "Memberships" },
  { href: "/admin/images", label: "Images & banners" },
  { href: "/admin/nonprofits", label: "Nonprofit Directory" },
];

export default function AdminAdvancedPage() {
  return (
    <>
      <AdminPanelShell panelId="advanced">
        <div className="adminTaskGrid">
          {ADVANCED_LINKS.map((item) => (
            <Link key={item.href} className="adminTaskCard" href={item.href}>
              <strong>{item.label}</strong>
            </Link>
          ))}
        </div>
        <AdminAdvancedSettings
          title="Legacy routes"
          description="Older admin URLs kept for bookmarks. Prefer the links above."
        >
          <p className="adminMuted">
            <Link href="/admin/advanced">System status</Link> is embedded on this page (legacy{" "}
            <Link href="/admin/status">/admin/status</Link> redirects here).
          </p>
        </AdminAdvancedSettings>
      </AdminPanelShell>
      <AdminStatusPanel />
    </>
  );
}
