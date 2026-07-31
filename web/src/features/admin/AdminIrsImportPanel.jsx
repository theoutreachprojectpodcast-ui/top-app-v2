"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPanelShell from "@/components/admin/AdminPanelShell";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending_review", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "hidden", label: "Hidden" },
  { value: "rejected", label: "Rejected" },
];

function formatCount(n) {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

export default function AdminIrsImportPanel() {
  const [classification, setClassification] = useState(null);
  const [batches, setBatches] = useState([]);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [subsectionFilter, setSubsectionFilter] = useState("19");
  const [stateFilter, setStateFilter] = useState("");
  const [q, setQ] = useState("");
  const [importStates, setImportStates] = useState("dc");
  const [selectedDryRun, setSelectedDryRun] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadBatches = useCallback(async () => {
    const res = await fetch("/api/admin/irs-import?limit=30", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load import batches");
    setBatches(data.batches || []);
    setClassification(data.classification || null);
    const latestDry = (data.batches || []).find((b) => b.mode === "dry_run" && b.status === "succeeded");
    if (latestDry && !selectedDryRun) setSelectedDryRun(latestDry.id);
  }, [selectedDryRun]);

  const loadOrgs = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (subsectionFilter) params.set("subsection", subsectionFilter);
    if (stateFilter) params.set("state", stateFilter);
    if (q.trim()) params.set("q", q.trim());
    params.set("limit", "50");
    const res = await fetch(`/api/admin/irs-import/orgs?${params}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load organizations");
    setRows(data.rows || []);
    setCount(data.count);
  }, [statusFilter, subsectionFilter, stateFilter, q]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadBatches(), loadOrgs()]);
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }, [loadBatches, loadOrgs]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runImport(mode) {
    setRunning(true);
    setError("");
    setMessage("");
    try {
      const body = {
        mode,
        states: importStates,
        subsection: subsectionFilter || "19",
      };
      if (mode === "apply") {
        if (!selectedDryRun) {
          setError("Select a successful dry-run batch before applying.");
          return;
        }
        body.dryRunBatchId = selectedDryRun;
      }
      const res = await fetch("/api/admin/irs-import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setError(data.error || "Import failed");
        return;
      }
      const s = data.summary || {};
      setMessage(
        `${mode === "apply" ? "Apply" : "Dry-run"} complete — found ${formatCount(s.recordsFound)}, add ${formatCount(s.recordsAdded)}, update ${formatCount(s.recordsUpdated)}, skip ${formatCount(s.recordsSkipped)}, errors ${formatCount(s.errors)}. Batch ${data.batch?.id || ""}.`,
      );
      if (data.batch?.id && mode === "dry_run") setSelectedDryRun(data.batch.id);
      await refresh();
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setRunning(false);
    }
  }

  async function setOrgStatus(ein, directory_status) {
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/irs-import/orgs/${encodeURIComponent(ein)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directory_status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Status update failed");
        return;
      }
      setMessage(`Updated ${ein} → ${directory_status}`);
      await loadOrgs();
    } catch (err) {
      setError(String(err?.message || err));
    }
  }

  async function reverify(ein) {
    await setOrgStatus(ein, "pending_review");
  }

  return (
    <AdminPanelShell
      panelId="nonprofits"
      nested
      title="IRS nonprofit import"
      description="Import EO BMF veterans organizations (501(c)(19)), review pending rows, and view import logs. New imports stay pending_review and are never auto-featured or trusted."
      error={error}
      message={message}
    >
      {classification ? (
        <div className="adminMuted adminMt4">
          <p>
            Requested label <code>5019a</code> is not a valid IRS code. Interpreted as{" "}
            <strong>{classification.interpretedAs}</strong> (EO BMF SUBSECTION{" "}
            <code>{classification.eoBmfSubsection}</code>).
          </p>
        </div>
      ) : null}

      <h3 className="adminBlockTitle adminMt4">Run import</h3>
      <div className="adminToolbar">
        <label className="fieldLabel" htmlFor="irs-states">
          States
        </label>
        <input
          id="irs-states"
          className="adminConsoleInput"
          value={importStates}
          onChange={(e) => setImportStates(e.target.value)}
          placeholder="dc or va,md or all"
        />
        <label className="fieldLabel" htmlFor="irs-sub">
          Subsection
        </label>
        <input
          id="irs-sub"
          className="adminConsoleInput"
          value={subsectionFilter}
          onChange={(e) => setSubsectionFilter(e.target.value)}
          placeholder="19"
        />
        <button type="button" className="btnSoft" disabled={running || loading} onClick={() => void runImport("dry_run")}>
          Dry-run
        </button>
        <button type="button" className="btnPrimary" disabled={running || loading} onClick={() => void runImport("apply")}>
          Apply (after dry-run)
        </button>
      </div>
      <div className="adminToolbar">
        <label className="fieldLabel" htmlFor="irs-dry">
          Dry-run batch for apply
        </label>
        <select
          id="irs-dry"
          className="adminConsoleInput"
          value={selectedDryRun}
          onChange={(e) => setSelectedDryRun(e.target.value)}
        >
          <option value="">Select succeeded dry-run…</option>
          {batches
            .filter((b) => b.mode === "dry_run" && b.status === "succeeded")
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.id.slice(0, 8)}… — {b.records_found} found — {b.created_at}
              </option>
            ))}
        </select>
      </div>

      <h3 className="adminBlockTitle adminMt4">Import logs</h3>
      {loading ? <p className="adminMuted">Loading…</p> : null}
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th>Batch</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Class</th>
              <th>Found</th>
              <th>Added</th>
              <th>Updated</th>
              <th>Skipped</th>
              <th>Failed</th>
              <th>Source</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td>
                  <code title={b.id}>{String(b.id).slice(0, 8)}</code>
                </td>
                <td>{b.mode}</td>
                <td>{b.status}</td>
                <td>{b.classification_label || b.classification_filter}</td>
                <td>{formatCount(b.records_found)}</td>
                <td>{formatCount(b.records_added)}</td>
                <td>{formatCount(b.records_updated)}</td>
                <td>{formatCount(b.records_skipped)}</td>
                <td>{formatCount(b.records_failed)}</td>
                <td>
                  {(b.source_files || []).slice(0, 2).join(", ")}
                  {b.source_file_date ? ` (${b.source_file_date})` : ""}
                </td>
                <td>{b.triggered_by_email || "—"}</td>
              </tr>
            ))}
            {!batches.length && !loading ? (
              <tr>
                <td colSpan={11} className="adminMuted">
                  No import batches yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h3 className="adminBlockTitle adminMt4">Review imported organizations</h3>
      <div className="adminToolbar">
        <label className="fieldLabel" htmlFor="irs-status">
          Status
        </label>
        <select
          id="irs-status"
          className="adminConsoleInput"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="fieldLabel" htmlFor="irs-state-f">
          State
        </label>
        <input
          id="irs-state-f"
          className="adminConsoleInput"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          placeholder="DC"
        />
        <label className="fieldLabel" htmlFor="irs-q">
          Search
        </label>
        <input
          id="irs-q"
          className="adminConsoleInput"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, city, or EIN"
        />
        <button type="button" className="btnSoft" onClick={() => void loadOrgs()} disabled={loading}>
          Filter
        </button>
      </div>
      <p className="adminMuted">{formatCount(count)} matching organizations</p>
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th>Name</th>
              <th>EIN</th>
              <th>Location</th>
              <th>Subsection</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ein}>
                <td>{row.org_name}</td>
                <td>
                  <code>{row.ein}</code>
                </td>
                <td>
                  {[row.city, row.state, row.zip].filter(Boolean).join(", ")}
                </td>
                <td>
                  {row.irs_subsection}
                  {row.irs_classification ? ` / ${row.irs_classification}` : ""}
                </td>
                <td>{row.directory_status}</td>
                <td>
                  <div className="adminToolbar">
                    <button type="button" className="btnSoft" onClick={() => void setOrgStatus(row.ein, "approved")}>
                      Approve
                    </button>
                    <button type="button" className="btnSoft" onClick={() => void setOrgStatus(row.ein, "hidden")}>
                      Hide
                    </button>
                    <button type="button" className="btnSoft" onClick={() => void setOrgStatus(row.ein, "rejected")}>
                      Reject
                    </button>
                    <button type="button" className="btnSoft" onClick={() => void reverify(row.ein)}>
                      Re-verify
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !loading ? (
              <tr>
                <td colSpan={6} className="adminMuted">
                  No organizations match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminPanelShell>
  );
}
