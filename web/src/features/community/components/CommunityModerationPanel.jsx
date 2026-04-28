"use client";

import { useCallback, useEffect, useState } from "react";
import {
  approvePendingLocal,
  fetchPendingFeedFromApi,
  loadPendingSubmissionsLocal,
  rejectPendingLocal,
  reviewSubmission,
} from "@/features/community/api/communityApi";

/**
 * Moderation queue: cloud primary, local demo fallback. Visible admin surface for both themes.
 */
export default function CommunityModerationPanel({ supabase, userId, canModerate, onFeedChanged }) {
  const [pending, setPending] = useState(() => loadPendingSubmissionsLocal());
  const [cloudPending, setCloudPending] = useState([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [cloudError, setCloudError] = useState("");
  const [queueFilter, setQueueFilter] = useState("all");

  const reload = useCallback(async () => {
    setPending(loadPendingSubmissionsLocal());
    if (!canModerate) return;
    setLoadingCloud(true);
    setCloudError("");
    try {
      const rows = await fetchPendingFeedFromApi();
      setCloudPending(rows);
    } catch {
      setCloudError("Could not load cloud moderation queue.");
      setCloudPending([]);
    } finally {
      setLoadingCloud(false);
    }
  }, [canModerate]);

  useEffect(() => {
    reload();
  }, [reload]);

  const showCloudQueue = queueFilter === "cloud" || queueFilter === "all";
  const showLocalQueue = queueFilter === "local" || queueFilter === "all";
  const filteredCloudPending = cloudPending;
  const totalFiltered = (showCloudQueue ? filteredCloudPending.length : 0) + (showLocalQueue ? pending.length : 0);

  return (
    <section className="communityAdminSection" aria-labelledby="community-mod-heading">
      <header className="communityAdminSection__header">
        <div>
          <h3 id="community-mod-heading">Story review</h3>
          <p className="communityAdminSection__subtitle">
            Approve or reject submissions before they appear in the community feed. Cloud queue is primary; local storage is a
            demo fallback when Supabase is unavailable.
          </p>
        </div>
        {canModerate ? <span className="communityAdminRolePill">Moderator</span> : null}
      </header>

      {!canModerate ? (
        <div className="communityAdminCard communityAdminCard--notice">
          <p className="communityModEmpty">Moderator access is required to review submitted stories.</p>
        </div>
      ) : null}

      {canModerate && !pending.length && !cloudPending.length && !loadingCloud ? (
        <div className="communityAdminCard communityAdminCard--active">
          <p className="communityModEmpty">No pending submissions. New stories appear here after members submit.</p>
          <div className="communityModToolbar">
            <button type="button" className="btnSoft" onClick={reload}>
              Refresh queue
            </button>
          </div>
        </div>
      ) : null}

      {canModerate && (pending.length > 0 || cloudPending.length > 0 || loadingCloud) ? (
        <div className="communityAdminCard communityAdminCard--active">
          <p className="communityModHint">
            {loadingCloud && !filteredCloudPending.length && !pending.length && showCloudQueue ? (
              <>Loading moderation queue…</>
            ) : (
              <>
                <strong>{totalFiltered}</strong> item{totalFiltered === 1 ? "" : "s"} in view — moderation-first: posts stay hidden
                until approved.
              </>
            )}
          </p>
          <div className="communityModToolbar">
            <select value={queueFilter} onChange={(e) => setQueueFilter(e.target.value)} aria-label="Filter review queue">
              <option value="all">Cloud + local demo</option>
              <option value="cloud">Cloud queue only</option>
              <option value="local">Local demo queue only</option>
            </select>
            <button type="button" className="btnSoft" onClick={reload} disabled={loadingCloud}>
              {loadingCloud ? "Refreshing…" : "Refresh queue"}
            </button>
          </div>
          {cloudError ? <p className="applyError">{cloudError}</p> : null}
          {showCloudQueue && filteredCloudPending.length ? (
            <ul className="communityModList">
              {filteredCloudPending.map((p) => (
                <li key={`cloud-${p.id}`} className="communityModItem">
                  <div>
                    <strong>{p.title || "Untitled"}</strong>
                    <p className="communityModPreview">
                      {String(p.body || "").slice(0, 160)}
                      {String(p.body || "").length > 160 ? "…" : ""}
                    </p>
                    <span className="communityModMeta">
                      {p.authorName} · {p.status}
                    </span>
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
          {showLocalQueue && pending.length ? (
            <ul className="communityModList">
              {pending.map((p) => (
                <li key={p.id} className="communityModItem">
                  <div>
                    <strong>{p.title || "Untitled"}</strong>
                    <p className="communityModPreview">
                      {String(p.body || "").slice(0, 160)}
                      {String(p.body || "").length > 160 ? "…" : ""}
                    </p>
                    <span className="communityModMeta">
                      {p.author_name} · {p.status}
                    </span>
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
        </div>
      ) : null}
    </section>
  );
}
