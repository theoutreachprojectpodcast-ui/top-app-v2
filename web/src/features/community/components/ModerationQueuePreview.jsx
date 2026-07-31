"use client";

import AdminSectionCard from "@/components/admin/AdminSectionCard";
import AdminActionBar from "@/components/admin/AdminActionBar";
import AdminHelpText from "@/components/admin/AdminHelpText";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

/**
 * Staging UI for a future combined admin / moderation console.
 * Shows realistic control patterns without requiring moderator role.
 */
export default function ModerationQueuePreview() {
  return (
    <AdminSectionCard
      title="Moderation console (preview)"
      description="Staging layout for tools that will move into a dedicated admin workspace. No actions here change live data."
      badge={<AdminStatusBadge status="preview" />}
    >
      <AdminActionBar>
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
      </AdminActionBar>

      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th scope="col">Story</th>
              <th scope="col">Status</th>
              <th scope="col">Flags</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>“Found housing after transition…”</td>
              <td>
                <AdminStatusBadge status="review" />
              </td>
              <td className="adminMuted">—</td>
              <td>
                <button type="button" className="btnSoft" disabled>
                  Open
                </button>
              </td>
            </tr>
            <tr>
              <td>“Peer support line follow-up…”</td>
              <td>
                <AdminStatusBadge status="pending" />
              </td>
              <td>
                <AdminStatusBadge status="draft">Link check</AdminStatusBadge>
              </td>
              <td>
                <button type="button" className="btnSoft" disabled>
                  Open
                </button>
              </td>
            </tr>
            <tr>
              <td>“Thank you for career resources…”</td>
              <td>
                <AdminStatusBadge status="approved" />
              </td>
              <td className="adminMuted">—</td>
              <td>
                <button type="button" className="btnSoft" disabled>
                  Archive
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AdminHelpText>
        Real moderation continues in the review queue above when you have moderator access. This block documents the
        intended admin surface area.
      </AdminHelpText>
    </AdminSectionCard>
  );
}
