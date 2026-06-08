import Link from "next/link";

const OPS_LINKS = [
  { href: "/admin/contact", label: "Contact settings & submissions", desc: "Recipient routing and inbox" },
  { href: "/admin/forms", label: "Form submissions", desc: "General form_submissions table" },
  { href: "/admin/applications", label: "Sponsorship applications", desc: "Review and convert sponsors" },
  { href: "/admin/advanced", label: "Advanced / QA", desc: "Diagnostics and environment counters" },
];

export default function AdminOperationsPage() {
  return (
    <div className="adminPanel">
      <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 700 }}>
        Operations
      </h1>
      <p className="adminMuted">Cross-cutting operator tools—contact, forms, applications, and platform health.</p>
      <div className="adminDashboardGrid" style={{ marginTop: 16 }}>
        {OPS_LINKS.map((item) => (
          <Link key={item.href} className="adminDashboardCard" href={item.href}>
            <strong>{item.label}</strong>
            <span className="adminMuted">{item.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
