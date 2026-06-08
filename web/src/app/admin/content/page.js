import Link from "next/link";
import AdminHomepagePanel from "@/features/admin/AdminHomepagePanel";

export default function AdminContentPage() {
  return (
    <div className="adminPanel">
      <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 700 }}>
        Content management
      </h1>
      <p className="adminMuted" style={{ lineHeight: 1.55 }}>
        Manage public-facing homepage sponsors, the sponsors directory, and community posts. Changes persist to Supabase
        via secured admin APIs.
      </p>
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
      <AdminHomepagePanel />
    </div>
  );
}
