"use client";

import { useId, useState } from "react";
import AdminHelpText from "@/components/admin/AdminHelpText";

/**
 * @param {{ label?: string, onUploaded: (url: string) => void, hint?: string }}
 */
export default function AdminMediaUploadField({ label = "Upload image", onUploaded, hint }) {
  const inputId = useId();
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
      <label className="fieldLabel" htmlFor={inputId}>
        {label}
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="profileFileInput"
          onChange={(e) => void onFileChange(e)}
          disabled={busy}
        />
      </label>
      {hint ? <AdminHelpText>{hint}</AdminHelpText> : null}
      {busy ? <p className="adminMuted adminMuted--sm">Uploading…</p> : null}
      {error ? (
        <p className="adminFeedback adminFeedback--error adminMuted--sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
