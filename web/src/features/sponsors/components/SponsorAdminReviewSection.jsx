"use client";

import { useEffect, useMemo, useState } from "react";
import { listSponsorApplications, updateSponsorApplicationReview } from "@/features/sponsors/api/sponsorApi";
import { SPONSOR_REVIEW_STATUSES, SPONSOR_REVIEW_STATUS_LABEL } from "@/features/sponsors/admin/reviewStatuses";

const STATUS_ORDER = SPONSOR_REVIEW_STATUSES;
const STATUS_LABEL = SPONSOR_REVIEW_STATUS_LABEL;

export default function SponsorAdminReviewSection({ supabase }) {
  const [records, setRecords] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    setBusy(true);
    setError("");
    const result = await listSponsorApplications(supabase);
    if (result.warning) setStatus(result.warning);
    const nextRecords = Array.isArray(result.records) ? result.records : [];
    setRecords(nextRecords);
    if (!selectedId && nextRecords.length) {
      const firstId = String(nextRecords[0]?.id || "");
      setSelectedId(firstId);
      setNote(String(nextRecords[0]?.internal_notes || ""));
    }
    setBusy(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRecord = useMemo(
    () => records.find((row) => String(row?.id || "") === String(selectedId || "")) || null,
    [records, selectedId],
  );

  async function runAction(nextStatus) {
    if (!selectedRecord?.id) return;
    setBusy(true);
    setError("");
    setStatus("");
    const result = await updateSponsorApplicationReview(supabase, selectedRecord.id, nextStatus, note);
    if (!result.ok) setError(result.error || "Review action failed.");
    else setStatus(result.warning || `Updated to ${STATUS_LABEL[nextStatus]}.`);
    await load();
    setBusy(false);
  }

  return (
    <section className="card sponsorAdminSection" aria-labelledby="sponsor-admin-title">
      <div className="sponsorAdminSectionHead">
        <div>
          <h3 id="sponsor-admin-title">Sponsor Admin Review (staging)</h3>
          <p className="sponsorSectionLead">
            Preview review operations for sponsor submissions. This block is intentionally isolated so it can move into a dedicated admin interface.
          </p>
        </div>
        <span className="sponsorAdminBadge">Admin layer</span>
      </div>

      <div className="sponsorAdminGrid">
        <div className="sponsorAdminList" role="list" aria-label="Sponsor applications">
          {records.map((row) => {
            const id = String(row?.id || "");
            const isActive = id === String(selectedId || "");
            const statusKey = STATUS_ORDER.includes(row?.application_status) ? row.application_status : "submitted";
            return (
              <button
                type="button"
                key={id || `${row?.company_name || "application"}-${row?.created_at || ""}`}
                className={`sponsorAdminListItem ${isActive ? "isActive" : ""}`}
                onClick={() => {
                  setSelectedId(id);
                  setNote(String(row?.internal_notes || ""));
                }}
              >
                <strong>{row?.company_name || "Company"}</strong>
                <span>{row?.email || "No contact email"}</span>
                <span>{row?.sponsor_tier_name || "Tier not specified"}</span>
                <span className={`sponsorAdminStatus sponsorAdminStatus--${statusKey}`}>{STATUS_LABEL[statusKey]}</span>
              </button>
            );
          })}
          {!records.length && <p className="sponsorAdminEmpty">No submissions found yet.</p>}
        </div>

        <div className="sponsorAdminDetail">
          {selectedRecord ? (
            <>
              <h4>{selectedRecord.company_name || "Sponsor submission"}</h4>
              <p className="sponsorAdminMeta">
                {selectedRecord.first_name} {selectedRecord.last_name} · {selectedRecord.email}
              </p>
              <p className="sponsorAdminMeta">
                Tier: <strong>{selectedRecord.sponsor_tier_name || "N/A"}</strong>
              </p>
              <p className="sponsorAdminMeta">
                Current status:{" "}
                <span className={`sponsorAdminStatus sponsorAdminStatus--${selectedRecord.application_status || "submitted"}`}>
                  {STATUS_LABEL[selectedRecord.application_status] || "Submitted"}
                </span>
              </p>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Internal review notes or requested follow-up details"
              />
              <div className="sponsorAdminActions">
                <button type="button" className="btnSoft" disabled={busy} onClick={() => runAction("in_review")}>In Review</button>
                <button type="button" className="btnPrimary" disabled={busy} onClick={() => runAction("approved")}>Approve</button>
                <button type="button" className="btnSoft" disabled={busy} onClick={() => runAction("denied")}>Deny</button>
                <button type="button" className="btnSoft" disabled={busy} onClick={() => runAction("more_info_requested")}>Request More Info</button>
                <button type="button" className="btnSoft" disabled={busy} onClick={() => runAction("returned_for_revision")}>Return for Revision</button>
              </div>
            </>
          ) : (
            <p className="sponsorAdminEmpty">Select a submission to review actions and notes.</p>
          )}
        </div>
      </div>
      {error ? <p className="applyError">{error}</p> : null}
      {status ? <p className="applyStatus">{status}</p> : null}
    </section>
  );
}
