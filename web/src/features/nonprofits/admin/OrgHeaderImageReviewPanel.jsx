"use client";

import { useCallback, useState } from "react";
import AdminSectionCard from "@/components/admin/AdminSectionCard";
import AdminActionBar from "@/components/admin/AdminActionBar";
import AdminHelpText from "@/components/admin/AdminHelpText";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

function digitsOnlyEin(value) {
  const d = String(value || "").replace(/\D/g, "");
  if (d.length > 9) return d.slice(-9);
  return d;
}

/**
 * Moderator-only: inspect, enrich, approve/reject, or manually curate directory header images (EIN-keyed enrichment).
 */
export default function OrgHeaderImageReviewPanel({ canModerate }) {
  const [einInput, setEinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState(null);
  const [manualUrl, setManualUrl] = useState("");
  const [notes, setNotes] = useState("");

  const ein = digitsOnlyEin(einInput);

  const loadDetail = useCallback(async () => {
    setMessage("");
    if (ein.length !== 9) {
      setMessage("Enter a 9-digit EIN.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orgs/header-image?ein=${encodeURIComponent(ein)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetail(null);
        setMessage(data.error || data.message || "Could not load record.");
        return;
      }
      setDetail(data);
      setMessage("");
    } catch {
      setDetail(null);
      setMessage("Network error loading enrichment.");
    } finally {
      setLoading(false);
    }
  }, [ein]);

  const postJson = async (body) => {
    const res = await fetch("/api/admin/orgs/header-image", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { res, data: await res.json().catch(() => ({})) };
  };

  const patchJson = async (body) => {
    const res = await fetch("/api/admin/orgs/header-image", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { res, data: await res.json().catch(() => ({})) };
  };

  const onEnrich = async () => {
    setMessage("");
    if (ein.length !== 9) {
      setMessage("Enter a 9-digit EIN.");
      return;
    }
    setLoading(true);
    try {
      const { res, data } = await postJson({ ein, force: false });
      if (!res.ok) {
        setMessage(data.error || data.message || "Enrichment failed.");
        return;
      }
      setMessage(data.outcome ? `Done: ${data.outcome}` : "Enrichment finished.");
      await loadDetail();
    } finally {
      setLoading(false);
    }
  };

  const onBatch = async () => {
    setMessage("");
    setLoading(true);
    try {
      const { res, data } = await postJson({ mode: "batch", limit: 8, delayMs: 450, force: false });
      if (!res.ok) {
        setMessage(data.error || "Batch failed.");
        return;
      }
      const n = (data.results || []).length;
      setMessage(`Batch completed (${n} row(s)).`);
    } finally {
      setLoading(false);
    }
  };

  const onApprove = async () => {
    setMessage("");
    if (ein.length !== 9) return;
    setLoading(true);
    try {
      const { res, data } = await patchJson({ ein, action: "approve", notes });
      if (!res.ok) {
        setMessage(data.error || "Approve failed.");
        return;
      }
      setMessage("Approved.");
      await loadDetail();
    } finally {
      setLoading(false);
    }
  };

  const onReject = async () => {
    setMessage("");
    if (ein.length !== 9) return;
    setLoading(true);
    try {
      const { res, data } = await patchJson({ ein, action: "reject", notes });
      if (!res.ok) {
        setMessage(data.error || "Reject failed.");
        return;
      }
      setMessage("Rejected; header cleared.");
      await loadDetail();
    } finally {
      setLoading(false);
    }
  };

  const onCurate = async () => {
    setMessage("");
    if (ein.length !== 9) return;
    const url = String(manualUrl || "").trim();
    if (!url) {
      setMessage("Paste an https image URL to curate.");
      return;
    }
    setLoading(true);
    try {
      const { res, data } = await patchJson({ ein, action: "curate", header_image_url: url, notes });
      if (!res.ok) {
        setMessage(data.error || "Curate failed.");
        return;
      }
      setMessage("Curated URL saved.");
      await loadDetail();
    } finally {
      setLoading(false);
    }
  };

  if (!canModerate) return null;

  const en = detail?.enrichment;
  const headerUrl = String(en?.header_image_url || "").trim();

  return (
    <AdminSectionCard
      title="Organization header images"
      description="Research official site imagery once, store it in Supabase, and approve or replace matches. Directory and Trusted Resource cards read these fields only—no live scraping on each page view."
      badge={<AdminStatusBadge status="moderator" />}
    >
      <div className="adminFieldStack">
        <label className="fieldLabel" htmlFor="org-header-ein">
          EIN (9 digits)
          <input
            id="org-header-ein"
            className="adminConsoleInput"
            value={einInput}
            onChange={(e) => setEinInput(e.target.value)}
            placeholder="12-3456789"
            autoComplete="off"
            inputMode="numeric"
          />
        </label>
        <AdminActionBar>
          <button type="button" className="btnSoft" disabled={loading} onClick={() => void loadDetail()}>
            Load
          </button>
          <button
            type="button"
            className="btnPrimary"
            disabled={loading || ein.length !== 9}
            onClick={() => void onEnrich()}
          >
            Run enrichment
          </button>
          <button type="button" className="btnSoft" disabled={loading} onClick={() => void onBatch()}>
            Batch (8)
          </button>
        </AdminActionBar>

        {message ? <p className="adminMuted">{message}</p> : null}

        {en ? (
          <div className="adminFieldStack">
            <p className="adminMuted">
              <strong>Status:</strong> {String(en.header_image_status || "—")} · <strong>Review:</strong>{" "}
              {String(en.header_image_review_status || "—")}
            </p>
            {en.header_image_notes ? (
              <p className="adminMuted">
                <strong>Notes:</strong> {String(en.header_image_notes)}
              </p>
            ) : null}
            {headerUrl ? (
              <div className="adminOrgHeaderPreview">
                <p className="adminMuted adminMuted--sm">
                  Current header ({String(en.header_image_source_type || "unknown")})
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={headerUrl} alt="" className="adminOrgHeaderPreview__media" />
              </div>
            ) : (
              <AdminHelpText>No header image URL on file yet.</AdminHelpText>
            )}

            <label className="fieldLabel" htmlFor="org-header-notes">
              Moderator notes (optional)
              <input
                id="org-header-notes"
                className="adminConsoleInput"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Context for approve/reject"
              />
            </label>

            <AdminActionBar>
              <button type="button" className="btnSoft" disabled={loading || !headerUrl} onClick={() => void onApprove()}>
                Approve
              </button>
              <button type="button" className="btnSoft" disabled={loading} onClick={() => void onReject()}>
                Reject
              </button>
            </AdminActionBar>

            <label className="fieldLabel" htmlFor="org-header-manual-url">
              Manual image URL (curate)
              <input
                id="org-header-manual-url"
                className="adminConsoleInput"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://…"
              />
            </label>
            <AdminActionBar>
              <button type="button" className="btnSoft" disabled={loading} onClick={() => void onCurate()}>
                Save curated URL
              </button>
            </AdminActionBar>
          </div>
        ) : null}

        {!en && detail?.directory && ein.length === 9 ? (
          <AdminHelpText>
            No enrichment row yet—running enrichment will create one from the directory website when available.
          </AdminHelpText>
        ) : null}
      </div>
    </AdminSectionCard>
  );
}
