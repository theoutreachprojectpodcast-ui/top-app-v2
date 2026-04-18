"use client";

import { useCallback, useState } from "react";
import { runSponsorLogoEnrichment } from "@/features/sponsors/api/sponsorCatalogApi";

/**
 * Moderator-only: enrich, approve, reject, or manually set sponsor logos (DB + storage).
 */
export default function SponsorLogoReviewPanel({ showAdmin = false, onChanged }) {
  const [slugInput, setSlugInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState(null);
  const [manualUrl, setManualUrl] = useState("");
  const [notes, setNotes] = useState("");

  const slug = String(slugInput || "").trim().toLowerCase();

  const loadDetail = useCallback(async () => {
    setMessage("");
    if (!slug) {
      setMessage("Enter a sponsor slug.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sponsors/logo-enrichment?slug=${encodeURIComponent(slug)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetail(null);
        setMessage(data.error || "Could not load sponsor.");
        return;
      }
      setDetail(data);
      setMessage("");
    } catch {
      setDetail(null);
      setMessage("Network error.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const patchJson = async (body) => {
    const res = await fetch("/api/admin/sponsors/logo-enrichment", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { res, data: await res.json().catch(() => ({})) };
  };

  const onEnrich = async () => {
    setMessage("");
    if (!slug) return;
    setLoading(true);
    try {
      const result = await runSponsorLogoEnrichment(slug, { force: false });
      if (!result.ok) {
        setMessage(result.error || "Enrichment failed.");
        return;
      }
      setMessage(result.outcome ? `Done: ${result.outcome}` : "Logo enrichment finished.");
      onChanged?.();
      await loadDetail();
    } finally {
      setLoading(false);
    }
  };

  const onBatch = async () => {
    setMessage("");
    setLoading(true);
    try {
      const result = await runSponsorLogoEnrichment("", { batch: true, limit: 8 });
      if (!result.ok) {
        setMessage(result.error || "Batch failed.");
        return;
      }
      const n = (result.results || []).length;
      setMessage(`Batch finished (${n} sponsor(s)).`);
      onChanged?.();
    } finally {
      setLoading(false);
    }
  };

  const onApprove = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const { res, data } = await patchJson({ slug, action: "approve", notes });
      if (!res.ok) {
        setMessage(data.error || "Approve failed.");
        return;
      }
      setMessage("Approved.");
      onChanged?.();
      await loadDetail();
    } finally {
      setLoading(false);
    }
  };

  const onReject = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const { res, data } = await patchJson({ slug, action: "reject", notes });
      if (!res.ok) {
        setMessage(data.error || "Reject failed.");
        return;
      }
      setMessage("Rejected; logo cleared.");
      onChanged?.();
      await loadDetail();
    } finally {
      setLoading(false);
    }
  };

  const onCurate = async () => {
    if (!slug) return;
    const url = String(manualUrl || "").trim();
    if (!url) {
      setMessage("Paste an https image URL.");
      return;
    }
    setLoading(true);
    try {
      const { res, data } = await patchJson({ slug, action: "curate", logo_url: url, notes });
      if (!res.ok) {
        setMessage(data.error || "Curate failed.");
        return;
      }
      setMessage("Curated URL saved.");
      onChanged?.();
      await loadDetail();
    } finally {
      setLoading(false);
    }
  };

  if (!showAdmin) return null;

  const sp = detail?.sponsor;
  const logoUrl = String(sp?.logo_url || "").trim();

  return (
    <section className="card sponsorAdminSection" aria-labelledby="sponsor-logo-admin-title">
      <div className="sponsorAdminSectionHead">
        <div>
          <h3 id="sponsor-logo-admin-title">Sponsor logo enrichment</h3>
          <p className="sponsorSectionLead">
            Discover logos from the official site once, store in Supabase when possible, and approve or replace matches. Cards read{" "}
            <code>logo_url</code> from the database only — no third-party logo hotlinks on render.
          </p>
        </div>
        <span className="sponsorAdminBadge">Moderator</span>
      </div>

      <div className="sponsorAdminEditorToolbar" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <label className="sponsorSectionLead" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Slug</span>
          <input
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            placeholder="gameday-mens-health"
            style={{ minWidth: 220, padding: "0.45rem 0.6rem", borderRadius: 8, border: "1px solid var(--color-border-subtle)" }}
          />
        </label>
        <button type="button" className="btnSoft" disabled={loading} onClick={loadDetail}>
          Load
        </button>
        <button type="button" className="btnPrimary" disabled={loading || !slug} onClick={onEnrich}>
          Run logo enrichment
        </button>
        <button type="button" className="btnSoft" disabled={loading} onClick={onBatch}>
          Batch (8)
        </button>
      </div>

      {message ? <p className="sponsorSectionLead" style={{ marginTop: "0.5rem" }}>{message}</p> : null}

      {sp ? (
        <div className="sponsorSectionLead" style={{ marginTop: "0.75rem" }}>
          <p>
            <strong>{String(sp.name || sp.slug)}</strong> — status: {String(sp.logo_status || "—")} · review:{" "}
            {String(sp.logo_review_status || "—")}
          </p>
          {sp.logo_notes ? (
            <p>
              <strong>Notes:</strong> {String(sp.logo_notes)}
            </p>
          ) : null}
          {logoUrl ? (
            <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  border: "1px solid var(--color-border-subtle)",
                  background: "var(--color-surface-card)",
                  backgroundImage: `url(${JSON.stringify(logoUrl)})`,
                  backgroundSize: "contain",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              />
              <span className="sponsorMuted" style={{ wordBreak: "break-all" }}>
                {logoUrl}
              </span>
            </div>
          ) : (
            <p>No logo URL on file.</p>
          )}

          <label className="sponsorSectionLead" style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.75rem" }}>
            <span>Moderator notes</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              style={{ maxWidth: 480, padding: "0.45rem 0.6rem", borderRadius: 8, border: "1px solid var(--color-border-subtle)" }}
            />
          </label>
          <div className="sponsorAdminEditorToolbar" style={{ marginTop: "0.5rem" }}>
            <button type="button" className="btnSoft" disabled={loading || !logoUrl} onClick={onApprove}>
              Approve
            </button>
            <button type="button" className="btnSoft" disabled={loading} onClick={onReject}>
              Reject
            </button>
          </div>
          <label className="sponsorSectionLead" style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.75rem" }}>
            <span>Manual logo URL</span>
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
    </section>
  );
}
