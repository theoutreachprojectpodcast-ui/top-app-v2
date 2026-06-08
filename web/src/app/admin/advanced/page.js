import Link from "next/link";
import AdminStatusPanel from "@/features/admin/AdminStatusPanel";

const ADVANCED_LINKS = [
  { href: "/admin/status", label: "QA status (legacy route)" },
  { href: "/admin/settings", label: "Platform settings" },
  { href: "/admin/forms", label: "Form submissions" },
  { href: "/admin/applications", label: "Sponsorship applications" },
  { href: "/admin/contact", label: "Contact routing & submissions" },
  { href: "/admin/billing", label: "Billing / invoice tools" },
  { href: "/admin/membership", label: "Membership health" },
  { href: "/admin/images", label: "Page image manager" },
  { href: "/admin/nonprofits", label: "Nonprofit directory (EIN enrichment)" },
];

export default function AdminAdvancedPage() {
  return (
    <>
      <div className="adminPanel">
        <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 700 }}>
          Advanced
        </h1>
        <p className="adminMuted" style={{ lineHeight: 1.55 }}>
          Environment diagnostics, QA counters, seed tooling references, and secondary admin tools. This area is for
          operators and engineers—not day-to-day content editing.
        </p>
        <nav className="adminAdvancedLinks" aria-label="Advanced admin tools">
          {ADVANCED_LINKS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <AdminStatusPanel />
    </>
  );
}
