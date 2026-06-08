"use client";

import { useCallback, useEffect, useState } from "react";
import AdminScopeBanner from "@/components/admin/AdminScopeBanner";
import AdminMediaUploadField from "@/components/admin/AdminMediaUploadField";
import Link from "next/link";

function copyUrl(url) {
  if (!url || !navigator.clipboard) return;
  void navigator.clipboard.writeText(url);
}

export default function AdminMediaLibraryPanel() {
  const [uploads, setUploads] = useState([]);
  const [pageImages, setPageImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/media-library", { credentials: "include", cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not load assets.");
        return;
      }
      setUploads(Array.isArray(body.uploads) ? body.uploads : []);
      setPageImages(Array.isArray(body.pageImages) ? body.pageImages : []);
      if (body.uploadsTableReady === false) {
        setError("Run page_content_blocks_admin_v10.sql in Supabase to enable uploads registry.");
      }
    } catch {
      setError("Could not load assets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function onUploaded(url) {
    setCopied(url);
    void load();
  }

  return (
    <div className="adminPanel">
      <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 700 }}>
        Media library
      </h1>
      <AdminScopeBanner readiness="production" title="Reusable assets">
        Upload images to the <code>admin-media</code> bucket (max 10 MB). Copy public URLs into sponsors, community posts, page
        images, or the content wizard.
      </AdminScopeBanner>

      <div style={{ marginTop: 16 }}>
        <AdminMediaUploadField
          label="Upload to media library"
          hint="JPEG, PNG, WebP, or GIF. Stored in Supabase Storage with a public URL."
          onUploaded={onUploaded}
        />
        {copied ? (
          <p className="adminMuted" style={{ marginTop: 8 }}>
            URL copied to clipboard: {String(copied).slice(0, 64)}…
          </p>
        ) : null}
      </div>

      <p style={{ marginTop: 16 }}>
        <Link className="btnSoft" href="/admin/images">
          Open page image manager
        </Link>
        {" "}
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </p>

      {error ? <p role="alert" style={{ color: "var(--color-danger, #b42318)", marginTop: 12 }}>{error}</p> : null}
      {loading ? <p className="adminMuted">Loading…</p> : null}

      <h2 style={{ fontSize: "1.05rem", marginTop: 24 }}>Uploaded assets ({uploads.length})</h2>
      <div className="adminDashboardGrid" style={{ marginTop: 12 }}>
        {uploads.map((row) => (
          <div key={row.id} className="adminDashboardCard adminMediaCard" style={{ cursor: "default" }}>
            {row.public_url ? (
              <img src={row.public_url} alt={row.alt_text || row.filename || "Asset"} className="adminMediaCard__thumb" />
            ) : null}
            <strong>{row.filename || "Upload"}</strong>
            <span className="adminMuted">{row.mime_type}</span>
            {row.tags?.length ? <span className="adminMuted">{row.tags.join(", ")}</span> : null}
            <button
              type="button"
              className="btnSoft"
              onClick={() => {
                copyUrl(row.public_url);
                setCopied(row.public_url);
              }}
            >
              Copy URL
            </button>
          </div>
        ))}
      </div>
      {!loading && uploads.length === 0 ? <p className="adminMuted">No uploads yet.</p> : null}

      <h2 style={{ fontSize: "1.05rem", marginTop: 28 }}>Page images ({pageImages.length})</h2>
      <div className="adminDashboardGrid" style={{ marginTop: 12 }}>
        {pageImages.map((row) => (
          <div key={row.id} className="adminDashboardCard" style={{ cursor: "default" }}>
            <strong>{row.page_key || row.section_key || "Asset"}</strong>
            <span className="adminMuted">{row.image_kind || "image"}</span>
            {row.image_url ? (
              <>
                <img src={row.image_url} alt="" className="adminMediaCard__thumb" />
                <button type="button" className="btnSoft" onClick={() => copyUrl(row.image_url)}>
                  Copy URL
                </button>
              </>
            ) : null}
          </div>
        ))}
      </div>
      {!loading && pageImages.length === 0 ? <p className="adminMuted">No page images yet.</p> : null}
    </div>
  );
}
