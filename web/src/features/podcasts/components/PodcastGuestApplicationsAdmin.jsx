"use client";

import { useEffect, useState } from "react";
import {
  acceptPodcastGuestFromApplication,
  deletePodcastGuestApplication,
  listPodcastGuestApplications,
  updatePodcastGuestApplicationStatus,
} from "@/features/podcasts/api/podcastApi";

const STATUS_FILTERS = ["all", "new", "submitted", "in_review", "approved", "denied", "needs_follow_up", "scheduled", "archived"];

export default function PodcastGuestApplicationsAdmin({ supabase }) {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
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

  const filtered =
    statusFilter === "all"
      ? rows
      : rows.filter((row) => String(row.status || "submitted").toLowerCase() === statusFilter);
  const selected = filtered.find((row) => String(row.id || "") === String(selectedId || ""));

  useEffect(() => {
    if (selectedId && !filtered.some((r) => String(r.id) === String(selectedId))) {
      setSelectedId(filtered[0]?.id ? String(filtered[0].id) : "");
    }
  }, [filtered, selectedId]);

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
      <div className="adminToolbar" style={{ marginBottom: 12 }}>
        <label className="fieldLabel" htmlFor="podcast-app-filter">
          Status
        </label>
        <select
          id="podcast-app-filter"
          className="adminConsoleInput"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All" : s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="podcastAdminGrid">
        <div className="podcastAdminList">
          {filtered.map((row) => (
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
          {!filtered.length ? (
            <p className="podcastMuted">{rows.length ? "No applications match this filter." : "No applications yet."}</p>
          ) : null}
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
