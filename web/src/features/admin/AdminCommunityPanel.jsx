"use client";

import OrgHeaderImageReviewPanel from "@/features/nonprofits/admin/OrgHeaderImageReviewPanel";
import ModerationQueuePreview from "@/features/community/components/ModerationQueuePreview";
import AdminMemberConnectionsPanel from "@/features/admin/AdminMemberConnectionsPanel";
import AdminPanelShell from "@/components/admin/AdminPanelShell";

/** Secondary community admin tools (org imagery, connections, local preview). */
export default function AdminCommunityPanel() {
  return (
    <AdminPanelShell
      panelId="community"
      title="Additional review tools"
      description="Member post approval, rejection, and publishing are in the section above. Use this area for member connections, nonprofit header image review, and the moderation queue preview."
      liveHint="Org header images appear on nonprofit profile pages at /nonprofit/[ein] when approved."
    >
      <AdminMemberConnectionsPanel />
      <OrgHeaderImageReviewPanel canModerate />
      <ModerationQueuePreview />
    </AdminPanelShell>
  );
}
