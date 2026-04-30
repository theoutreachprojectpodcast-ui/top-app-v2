import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="adminPanel">
      <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 700 }}>
        Platform admin
      </h1>
      <p className="adminMuted" style={{ lineHeight: 1.55 }}>
        Manage directory enrichment, trusted resources, sponsors, community moderation, and user records. All actions are
        persisted via secured APIs (service role + admin gate).
      </p>
      <ul style={{ margin: "16px 0 0", paddingLeft: "1.1rem", lineHeight: 1.7 }}>
        <li>
          <Link href="/admin/status">QA status</Link> — live readiness counters for admin-managed entities
        </li>
        <li>
          <Link href="/admin/community">Community</Link> — pending queue, bookmarks for follow-up, edit live posts
        </li>
        <li>
          <Link href="/admin/podcasts">Podcasts</Link> — guest application review and acceptance
        </li>
        <li>
          <Link href="/admin/nonprofits">Directory</Link> — nonprofit enrichment/media (EIN lookup)
        </li>
        <li>
          <Link href="/admin/trusted">Trusted resources</Link> — listing content and social links
        </li>
        <li>
          <Link href="/admin/sponsors">Sponsors</Link> — catalog copy, imagery, and links
        </li>
        <li>
          <Link href="/admin/applications">Applications</Link> — sponsorship review and conversion workflow
        </li>
        <li>
          <Link href="/admin/images">Image manager</Link> — page/section image records and activation
        </li>
        <li>
          <Link href="/admin/contact">Contact settings</Link> — recipient routing and submission review
        </li>
        <li>
          <Link href="/admin/billing">Invoice tools</Link> — send invoice emails and audit records
        </li>
        <li>
          <Link href="/admin/users">Users</Link> — search accounts, roles, and onboarding status
        </li>
      </ul>
    </div>
  );
}
