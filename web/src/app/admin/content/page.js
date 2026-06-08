import Link from "next/link";
import AdminHomepagePanel from "@/features/admin/AdminHomepagePanel";
import AdminPanelShell from "@/components/admin/AdminPanelShell";

export default function AdminContentPage() {
  return (
    <>
      <AdminPanelShell panelId="homepage">
      <p style={{ marginTop: 12 }}>
        <Link className="btnPrimary" href="/admin/content/create">
          Create content
        </Link>
      </p>
      <div className="adminContentHubGrid">
        <Link className="adminContentHubCard" href="/admin/sponsors">
          <strong>Sponsors</strong>
          <span className="adminMuted">Catalog, categories, homepage featured flags, logos</span>
        </Link>
        <Link className="adminContentHubCard" href="/admin/community">
          <strong>Community</strong>
          <span className="adminMuted">Moderation queue + staff posts</span>
        </Link>
        <Link className="adminContentHubCard" href="/admin/trusted">
          <strong>Trusted resources</strong>
          <span className="adminMuted">Trusted partner listings</span>
        </Link>
        <Link className="adminContentHubCard" href="/admin/images">
          <strong>Page images</strong>
          <span className="adminMuted">Section backgrounds and assets</span>
        </Link>
        <Link className="adminContentHubCard" href="/admin/content/blocks">
          <strong>Page content blocks</strong>
          <span className="adminMuted">About, footer, membership copy — universal table</span>
        </Link>
        <Link className="adminContentHubCard" href="/admin/media-library">
          <strong>Media library</strong>
          <span className="adminMuted">Upload and copy image URLs</span>
        </Link>
      </div>
      </AdminPanelShell>
      <AdminHomepagePanel />
    </>
  );
}
