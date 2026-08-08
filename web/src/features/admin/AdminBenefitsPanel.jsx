"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPanelShell from "@/components/admin/AdminPanelShell";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

const AUDIENCES = [
  ["veteran", "Veterans"],
  ["active_duty", "Active Duty"],
  ["first_responder", "First Responders"],
  ["family", "Families"],
];

function CandidateEvidence({ sources = [] }) {
  if (!sources.length) return <p className="adminMuted">No evidence attached.</p>;
  return (
    <ul>
      {sources.map((source) => (
        <li key={source.source_url}>
          <a href={source.source_url} target="_blank" rel="noreferrer">
            {source.source_title || source.source_url}
          </a>{" "}
          <span className="adminMuted">— {source.source_type}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AdminBenefitsPanel() {
  const [query, setQuery] = useState(
    "Find unusual, high-value benefits that military and first-responder families are unlikely to discover on their own.",
  );
  const [stateCodes, setStateCodes] = useState("");
  const [audiences, setAudiences] = useState(["veteran", "active_duty", "first_responder", "family"]);
  const [persist, setPersist] = useState(false);
  const [writesEnabled, setWritesEnabled] = useState(false);
  const [queue, setQueue] = useState([]);
  const [research, setResearch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadQueue = useCallback(async () => {
    const response = await fetch("/api/admin/benefits/candidates", { credentials: "include" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Failed to load Benefits candidates.");
    setQueue(data.candidates || []);
    setWritesEnabled(data.writesEnabled === true);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadQueue()
      .catch((err) => {
        if (active) setError(String(err?.message || err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadQueue]);

  function toggleAudience(value) {
    setAudiences((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function runResearch() {
    setRunning(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/benefits/research", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          audiences,
          stateCodes: stateCodes
            .split(",")
            .map((value) => value.trim().toUpperCase())
            .filter(Boolean),
          limit: 5,
          persist: persist && writesEnabled,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Benefits research failed.");
      setResearch(data.result || null);
      setMessage(
        persist && writesEnabled
          ? `${data.persisted?.length || 0} gated candidates added to the QA review inbox.`
          : "Dry research finished. No database records were created.",
      );
      if (persist && writesEnabled) await loadQueue();
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setRunning(false);
    }
  }

  async function reviewCandidate(id, action) {
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/benefits/candidates/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Candidate review failed.");
      setMessage(
        action === "accept_as_draft"
          ? "Candidate accepted as an unpublished draft. A separate publication review is still required."
          : action === "needs_more_info"
            ? "Candidate returned for more research."
            : "Candidate rejected.",
      );
      await loadQueue();
    } catch (err) {
      setError(String(err?.message || err));
    }
  }

  return (
    <AdminPanelShell
      panelId="benefits"
      title="Benefits research & review"
      description="Research unusual member benefits, inspect source evidence, and convert selected proposals into unpublished drafts. Agents cannot publish."
      status="partial"
      statusLabel="QA only"
      error={error}
      message={message}
    >
      <h3 className="adminBlockTitle">Run a controlled search</h3>
      <label className="fieldLabel" htmlFor="benefits-research-query">
        Research mission
      </label>
      <textarea
        id="benefits-research-query"
        className="adminConsoleInput"
        rows={4}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="adminToolbar adminMt4">
        {AUDIENCES.map(([value, label]) => (
          <label key={value}>
            <input
              type="checkbox"
              checked={audiences.includes(value)}
              onChange={() => toggleAudience(value)}
            />{" "}
            {label}
          </label>
        ))}
      </div>

      <div className="adminToolbar adminMt4">
        <label className="fieldLabel" htmlFor="benefits-state-codes">
          Optional states
        </label>
        <input
          id="benefits-state-codes"
          className="adminConsoleInput"
          value={stateCodes}
          onChange={(event) => setStateCodes(event.target.value)}
          placeholder="NV, TX"
        />
        <label title={writesEnabled ? "Save passed candidates to QA" : "Enable only after QA keys are configured"}>
          <input
            type="checkbox"
            checked={persist && writesEnabled}
            disabled={!writesEnabled}
            onChange={(event) => setPersist(event.target.checked)}
          />{" "}
          Save passed candidates to QA inbox
        </label>
        <button type="button" className="btnPrimary" disabled={running || !query.trim()} onClick={runResearch}>
          {running ? "Researching…" : "Run research"}
        </button>
      </div>
      <p className="adminMuted">
        {writesEnabled
          ? "QA candidate writes are enabled. Publication is still unavailable to agents."
          : "Dry-run mode only. No research result can write to the database."}
      </p>

      {research ? (
        <section className="adminMt4">
          <h3 className="adminBlockTitle">Latest research run</h3>
          <p className="adminMuted">
            Run {research.runId} · {research.model}
          </p>
          <p>{research.searchSummary}</p>
          {(research.candidates || []).map((item, index) => (
            <article className="adminPanel adminPanel--nested adminMt4" key={item.gate?.dedupeKey || index}>
              <div className="adminToolbar">
                <h4>{item.candidate?.title || item.lead?.working_title || "Rejected lead"}</h4>
                <AdminStatusBadge status={item.gate?.ok ? "approved" : "attention"}>
                  {item.gate?.ok ? "Passed gate" : "Blocked"}
                </AdminStatusBadge>
              </div>
              <p>{item.candidate?.summary || item.verification?.explanation}</p>
              {!item.gate?.ok ? (
                <ul>
                  {(item.gate?.reasons || []).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}
              <CandidateEvidence sources={item.candidate?.sources || item.verification?.sources || []} />
            </article>
          ))}
        </section>
      ) : null}

      <section className="adminMt4">
        <h3 className="adminBlockTitle">Agent candidate inbox</h3>
        {loading ? <p className="adminMuted">Loading…</p> : null}
        {!loading && queue.length === 0 ? <p className="adminMuted">No agent candidates yet.</p> : null}
        {queue.map((item) => {
          const candidate = item.proposed_record || {};
          return (
            <article className="adminPanel adminPanel--nested adminMt4" key={item.id}>
              <div className="adminToolbar">
                <h4>{candidate.title || "Untitled candidate"}</h4>
                <AdminStatusBadge status={item.status}>{item.status}</AdminStatusBadge>
                <AdminStatusBadge status={item.risk_level === "high" ? "attention" : "review"}>
                  {item.risk_level} risk
                </AdminStatusBadge>
              </div>
              <p>{candidate.summary}</p>
              <p className="adminMuted">
                {candidate.provider_name} · {candidate.availability_scope} · confidence {item.confidence_score ?? "—"}
              </p>
              <CandidateEvidence sources={item.evidence || []} />
              {item.status === "pending" || item.status === "needs_more_info" ? (
                <div className="adminToolbar">
                  <button type="button" className="btnPrimary" onClick={() => reviewCandidate(item.id, "accept_as_draft")}>
                    Accept as draft
                  </button>
                  <button type="button" className="btnSoft" onClick={() => reviewCandidate(item.id, "needs_more_info")}>
                    Research more
                  </button>
                  <button type="button" className="btnSoft" onClick={() => reviewCandidate(item.id, "reject")}>
                    Reject
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </AdminPanelShell>
  );
}

