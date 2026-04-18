"use client";

import { useEffect, useState } from "react";
import {
  acceptPodcastGuestFromApplication,
  deletePodcastGuestApplication,
  listPodcastGuestApplications,
  updatePodcastGuestApplicationStatus,
} from "@/features/podcasts/api/podcastApi";

export default function PodcastGuestApplicationsAdmin({ supabase }) {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const next = await listPodcastGuestApplications(supabase);
    setRows(next);
    if (!selectedId && next.length) {
      setSelectedId(String(next[0].id || ""));
      setNotes(String(next[0].internal_notes || ""));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const selected = rows.find((row) => String(row.id || "") === String(selectedId || ""));

  async function run(nextStatus) {
    if (!selected?.id) return;
    setError("");
    setStatus("");
    const result = await updatePodcastGuestApplicationStatus(supabase, selected.id, nextStatus, notes);
    if (result.ok && nextStatus === "approved") {
      await acceptPodcastGuestFromApplication(supabase, selected);
    }
    if (!result.ok) setError(result.error || "Could not update application.");
    else setStatus(result.warning || (nextStatus === "approved" ? "Accepted and added to upcoming guests." : `Updated to ${nextStatus}.`));
    await load();
  }

  async function runDelete() {
    if (!selected?.id) return;
    const ok = typeof window === "undefined" ? true : window.confirm("Delete this podcast application permanently?");
    if (!ok) return;
    setError("");
    setStatus("");
    const result = await deletePodcastGuestApplication(supabase, selected.id);
    if (!result.ok) {
      setError(result.error || "Could not delete application.");
      return;
    }
    setStatus("Application deleted.");
    setSelectedId("");
    setNotes("");
    await load();
  }

  return (
    <section className="podcastAdminSection">
      <h3>Podcast Guest Application Review</h3>
      <div className="podcastAdminGrid">
        <div className="podcastAdminList">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`podcastAdminRow ${String(row.id) === String(selectedId) ? "isActive" : ""}`}
              onClick={() => {
                setSelectedId(String(row.id));
                setNotes(String(row.internal_notes || ""));
              }}
            >
              <strong>{row.full_name || "Applicant"}</strong>
              <span>{row.email || "No email"}</span>
              <span>{row.status || "submitted"}</span>
            </button>
          ))}
          {!rows.length ? <p className="podcastMuted">No applications yet.</p> : null}
        </div>
        <div className="podcastAdminDetail">
          {selected ? (
            <>
              <h4>{selected.full_name}</h4>
              <p className="podcastMuted">{selected.organization || "No organization specified"} · {selected.email}</p>
              <p>{selected.topic_pitch}</p>
              <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes" />
              <div className="row wrap">
                <button className="btnSoft" type="button" onClick={() => run("in_review")}>In Review</button>
                <button className="btnPrimary" type="button" onClick={() => run("approved")}>Accept</button>
                <button className="btnSoft" type="button" onClick={() => run("needs_follow_up")}>Request More Info</button>
                <button className="btnSoft" type="button" onClick={() => run("denied")}>Decline</button>
                <button className="btnSoft podcastDangerBtn" type="button" onClick={runDelete}>Delete</button>
              </div>
            </>
          ) : (
            <p className="podcastMuted">Select an application to review.</p>
          )}
        </div>
      </div>
      {error ? <p className="applyError">{error}</p> : null}
      {status ? <p className="applyStatus">{status}</p> : null}
    </section>
  );
}
