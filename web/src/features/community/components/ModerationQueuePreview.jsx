"use client";

/**
 * Staging UI for a future combined admin / moderation console.
 * Shows realistic control patterns without requiring moderator role.
 */
export default function ModerationQueuePreview() {
  return (
    <section className="card moderationQueuePreview" aria-labelledby="mod-preview-title">
      <div className="moderationQueuePreviewHead">
        <div>
          <h3 id="mod-preview-title">Moderation console (preview)</h3>
          <p className="moderationQueuePreviewLead">
            Staging layout for tools that will move into a dedicated admin workspace. No actions here change live data.
          </p>
        </div>
        <span className="moderationQueuePreviewBadge">Preview</span>
      </div>

      <div className="moderationQueuePreviewToolbar">
        <button type="button" className="btnSoft" disabled>
          Assign reviewer
        </button>
        <button type="button" className="btnSoft" disabled>
          Bulk approve
        </button>
        <button type="button" className="btnSoft" disabled>
          Escalate
        </button>
        <button type="button" className="btnSoft" disabled>
          Export queue (CSV)
        </button>
      </div>

      <div className="moderationQueuePreviewTable" role="table" aria-label="Sample moderation queue">
        <div className="moderationQueuePreviewRow moderationQueuePreviewRow--head" role="row">
          <span role="columnheader">Story</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">Flags</span>
          <span role="columnheader">Actions</span>
        </div>
        <div className="moderationQueuePreviewRow" role="row">
          <span role="cell">“Found housing after transition…”</span>
          <span role="cell">
            <span className="modStatusPill modStatusPill--review">Under review</span>
          </span>
          <span role="cell">—</span>
          <span role="cell" className="modActionCells">
            <button type="button" className="btnSoft" disabled>
              Open
            </button>
          </span>
        </div>
        <div className="moderationQueuePreviewRow" role="row">
          <span role="cell">“Peer support line follow-up…”</span>
          <span role="cell">
            <span className="modStatusPill modStatusPill--pending">Submitted</span>
          </span>
          <span role="cell">
            <span className="modFlagPill">Link check</span>
          </span>
          <span role="cell" className="modActionCells">
            <button type="button" className="btnSoft" disabled>
              Open
            </button>
          </span>
        </div>
        <div className="moderationQueuePreviewRow" role="row">
          <span role="cell">“Thank you for career resources…”</span>
          <span role="cell">
            <span className="modStatusPill modStatusPill--ok">Approved</span>
          </span>
          <span role="cell">—</span>
          <span role="cell" className="modActionCells">
            <button type="button" className="btnSoft" disabled>
              Archive
            </button>
          </span>
        </div>
      </div>
      <p className="moderationQueuePreviewFoot">
        Real moderation continues in the review queue above when you have moderator access. This block documents the intended admin surface area.
      </p>
    </section>
  );
}
