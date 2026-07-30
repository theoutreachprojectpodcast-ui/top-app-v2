import Link from "next/link";
import AdminPanelShell from "@/components/admin/AdminPanelShell";

const OPS_LINKS = [
  { href: "/admin/contact", label: "Contact inbox", desc: "Messages and routing" },
  { href: "/admin/forms", label: "Form submissions", desc: "Cross-form inbox" },
  { href: "/admin/applications", label: "Partner activity", desc: "Sponsorship applications" },
  { href: "/admin/advanced", label: "Integrations & tools", desc: "Diagnostics and system status" },
  { href: "/admin/analytics", label: "Reports", desc: "Platform metrics" },
];

export default function AdminOperationsPage() {
  return (
    <AdminPanelShell panelId="operations">
      <div className="adminTaskGrid">
        {OPS_LINKS.map((item) => (
          <Link key={item.href} className="adminTaskCard" href={item.href}>
            <strong>{item.label}</strong>
            <span className="adminMuted">{item.desc}</span>
          </Link>
        ))}
      </div>
    </AdminPanelShell>
  );
}
