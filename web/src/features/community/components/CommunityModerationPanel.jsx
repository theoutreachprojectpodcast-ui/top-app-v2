"use client";

import { useState } from "react";
import {
  approvePendingLocal,
  loadPendingSubmissionsLocal,
  rejectPendingLocal,
} from "@/features/community/api/communityApi";

/**
 * Demo-only moderation surface so the moderation-first model is visible without a full admin app.
 */
export default function CommunityModerationPanel({ onFeedChanged }) {
  const [pending, setPending] = useState(() => loadPendingSubmissionsLocal());

  function reload() {
    setPending(loadPendingSubmissionsLocal());
  }

  if (!pending.length) {
    return (
      <details className="communityModPanel">
        <summary>Review queue (demo)</summary>
        <p className="communityModEmpty">No pending local submissions. New stories appear here when submitted offline or if the database is not yet configured.</p>
      </details>
    );
  }

  return (
    <details className="communityModPanel">
      <summary>Review queue (demo) — {pending.length} pending</summary>
      <p className="communityModHint">
        Approve adds a story to the public feed for this browser (demo). Production would use moderator accounts and Supabase policies.
      </p>
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
    </details>
  );
}

