"use client";

import { useCallback, useEffect, useState } from "react";
import {
  approvePendingLocal,
  fetchPendingFeedFromSupabase,
  loadPendingSubmissionsLocal,
  rejectPendingLocal,
  reviewSubmission,
} from "@/features/community/api/communityApi";

/**
 * Demo-only moderation surface so the moderation-first model is visible without a full admin app.
 */
export default function CommunityModerationPanel({ supabase, userId, canModerate, onFeedChanged }) {
  const [pending, setPending] = useState(() => loadPendingSubmissionsLocal());
  const [cloudPending, setCloudPending] = useState([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [cloudError, setCloudError] = useState("");
  const [queueFilter, setQueueFilter] = useState("all");

  const reload = useCallback(async () => {
    setPending(loadPendingSubmissionsLocal());
    if (!supabase || !canModerate) return;
    setLoadingCloud(true);
    setCloudError("");
    try {
      const rows = await fetchPendingFeedFromSupabase(supabase);
      setCloudPending(rows);
    } catch {
      setCloudError("Could not load cloud moderation queue.");
      setCloudPending([]);
    } finally {
      setLoadingCloud(false);
    }
  }, [supabase, canModerate]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!canModerate) {
    return (
      <details className="communityModPanel">
        <summary>Review queue</summary>
        <p className="communityModEmpty">Moderator access is required to review submitted stories.</p>
      </details>
    );
  }

  if (!pending.length && !cloudPending.length && !loadingCloud) {
    return (
      <details className="communityModPanel" open>
        <summary>Review queue (demo)</summary>
        <p className="communityModEmpty">No pending submissions. New stories appear here after user submission.</p>
        <div className="row wrap">
          <button type="button" className="btnSoft" onClick={reload}>Refresh Queue</button>
        </div>
      </details>
    );
  }

  const showCloudQueue = queueFilter === "all" || queueFilter === "submitted" || queueFilter === "under_review";
  const showLocalQueue = queueFilter === "all" || queueFilter === "local";
  const filteredCloudPending =
    queueFilter === "submitted" || queueFilter === "under_review"
      ? cloudPending.filter((p) => p.status === queueFilter)
      : cloudPending;
  const totalFiltered = (showCloudQueue ? filteredCloudPending.length : 0) + (showLocalQueue ? pending.length : 0);

  return (
    <details className="communityModPanel" open>
      <summary>
        Review queue — {totalFiltered} pending
      </summary>
      <p className="communityModHint">
        Moderation-first: posts remain hidden until approved. Cloud queue is primary, local queue is demo fallback.
      </p>
      <div className="row wrap communityModControls">
        <select value={queueFilter} onChange={(e) => setQueueFilter(e.target.value)} aria-label="Filter review queue">
          <option value="all">All queues</option>
          <option value="submitted">Submitted only</option>
          <option value="under_review">Under review only</option>
          <option value="local">Local demo queue only</option>
        </select>
        <button type="button" className="btnSoft" onClick={reload} disabled={loadingCloud}>
          {loadingCloud ? "Refreshing…" : "Refresh Queue"}
        </button>
      </div>
      {cloudError ? <p className="applyError">{cloudError}</p> : null}
      {showCloudQueue && filteredCloudPending.length ? (
        <ul className="communityModList">
          {filteredCloudPending.map((p) => (
            <li key={`cloud-${p.id}`} className="communityModItem">
              <div>
                <strong>{p.title || "Untitled"}</strong>
                <p className="communityModPreview">{String(p.body || "").slice(0, 160)}{String(p.body || "").length > 160 ? "…" : ""}</p>
                <span className="communityModMeta">{p.authorName} · {p.status}</span>
              </div>
              <div className="row wrap">
                <button
                  type="button"
                  className="btnSoft"
                  onClick={async () => {
                    await reviewSubmission(supabase, {
                      postId: p.id,
                      action: "reject",
                      reviewerId: userId,
                      rejectionReason: "Did not meet moderation guidelines.",
                    });
                    await reload();
                    onFeedChanged?.();
                  }}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="btnPrimary"
                  onClick={async () => {
                    await reviewSubmission(supabase, {
                      postId: p.id,
                      action: "approve",
                      reviewerId: userId,
                    });
                    await reload();
                    onFeedChanged?.();
                  }}
                >
                  Approve
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {showLocalQueue ? (
      <ul className="communityModList">
        {pending.map((p) => (
          <li key={p.id} className="communityModItem">
            <div>
              <strong>{p.title || "Untitled"}</strong>
              <p className="communityModPreview">{String(p.body || "").slice(0, 160)}{String(p.body || "").length > 160 ? "…" : ""}</p>
              <span className="communityModMeta">{p.author_name} · {p.status}</span>
            </div>
            <div className="row wrap">
              <button
                type="button"
                className="btnSoft"
                onClick={() => {
                  rejectPendingLocal(p.id);
                  reload();
                }}
              >
                Reject
              </button>
              <button
                type="button"
                className="btnPrimary"
                onClick={() => {
                  approvePendingLocal(p.id);
                  reload();
                  onFeedChanged?.();
                }}
              >
                Approve
              </button>
            </div>
          </li>
        ))}
      </ul>
      ) : null}
    </details>
  );
}

