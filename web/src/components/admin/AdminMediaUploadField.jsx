"use client";

import { useState } from "react";

/**
 * @param {{ label?: string, onUploaded: (url: string) => void, hint?: string }}
 */
export default function AdminMediaUploadField({ label = "Upload image", onUploaded, hint }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/media-library/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || data.message || "Upload failed.");
        return;
      }
      if (data.publicUrl) onUploaded(data.publicUrl);
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminMediaUpload">
      <label className="profilePhotoUploadLabel">
        <span className="profilePhotoUploadTitle">{label}</span>
        {hint ? <span className="profilePhotoUploadHint">{hint}</span> : null}
        <span className="btnSoft" style={{ display: "inline-block", marginTop: 8 }}>
          {busy ? "Uploading…" : "Choose file"}
        </span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="profileFileInput" onChange={(e) => void onFileChange(e)} disabled={busy} />
      </label>
      {error ? (
        <p role="alert" style={{ color: "var(--color-danger, #b42318)", fontSize: "0.85rem", marginTop: 8 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
