"use client";

import { useCallback, useState } from "react";

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
    <section className="communityAdminSection" aria-labelledby="org-header-admin-title">
      <header className="communityAdminSection__header">
        <div>
          <h3 id="org-header-admin-title">Organization header images</h3>
          <p className="communityAdminSection__subtitle">
            Research official site imagery once, store it in Supabase, and approve or replace matches. Directory and Trusted
            Resource cards read these fields only—no live scraping on each page view.
          </p>
        </div>
        <span className="communityAdminRolePill">Moderator</span>
      </header>

      <div className="communityAdminCard communityAdminCard--active">
        <div className="communityModToolbar" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
          <label className="communityModHint" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span>EIN (9 digits)</span>
            <input
              value={einInput}
              onChange={(e) => setEinInput(e.target.value)}
              placeholder="12-3456789"
              autoComplete="off"
              style={{ minWidth: 200, padding: "0.45rem 0.6rem", borderRadius: 8, border: "1px solid var(--color-border-subtle)" }}
            />
          </label>
          <button type="button" className="btnSoft" disabled={loading} onClick={loadDetail}>
            Load
          </button>
          <button type="button" className="btnPrimary" disabled={loading || ein.length !== 9} onClick={onEnrich}>
            Run enrichment
          </button>
          <button type="button" className="btnSoft" disabled={loading} onClick={onBatch}>
            Batch (8)
          </button>
        </div>

        {message ? <p className="communityModHint">{message}</p> : null}

        {en ? (
          <div className="communityModHint" style={{ marginTop: "0.75rem" }}>
            <p>
              <strong>Status:</strong> {String(en.header_image_status || "—")} ·{" "}
              <strong>Review:</strong> {String(en.header_image_review_status || "—")}
            </p>
            {en.header_image_notes ? (
              <p>
                <strong>Notes:</strong> {String(en.header_image_notes)}
              </p>
            ) : null}
            {headerUrl ? (
              <div style={{ marginTop: "0.5rem" }}>
                <p>
                  <strong>Current header</strong> ({String(en.header_image_source_type || "unknown")})
                </p>
                <div
                  style={{
                    marginTop: "0.35rem",
                    height: 88,
                    borderRadius: 12,
                    background: `linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.45)), url(${JSON.stringify(headerUrl)}) center/cover`,
                    border: "1px solid color-mix(in srgb, var(--color-border-subtle) 80%, transparent)",
                  }}
                />
              </div>
            ) : (
              <p>No header image URL on file yet.</p>
            )}

            <label className="communityModHint" style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.75rem" }}>
              <span>Moderator notes (optional)</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Context for approve/reject"
                style={{ maxWidth: 480, padding: "0.45rem 0.6rem", borderRadius: 8, border: "1px solid var(--color-border-subtle)" }}
              />
            </label>

            <div className="communityModToolbar" style={{ marginTop: "0.5rem" }}>
              <button type="button" className="btnSoft" disabled={loading || !headerUrl} onClick={onApprove}>
                Approve
              </button>
              <button type="button" className="btnSoft" disabled={loading} onClick={onReject}>
                Reject
              </button>
            </div>

            <label className="communityModHint" style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.75rem" }}>
              <span>Manual image URL (curate)</span>
              <input
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://…"
                style={{ maxWidth: 480, padding: "0.45rem 0.6rem", borderRadius: 8, border: "1px solid var(--color-border-subtle)" }}
              />
            </label>
            <button type="button" className="btnSoft" disabled={loading} onClick={onCurate}>
              Save curated URL
            </button>
          </div>
        ) : null}

        {!en && detail?.directory && ein.length === 9 ? (
          <p className="communityModEmpty" style={{ marginTop: "0.5rem" }}>
            No enrichment row yet—running enrichment will create one from the directory website when available.
          </p>
        ) : null}
      </div>
    </section>
  );
}
