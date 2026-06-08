"use client";

import OrgHeaderImageReviewPanel from "@/features/nonprofits/admin/OrgHeaderImageReviewPanel";
import ModerationQueuePreview from "@/features/community/components/ModerationQueuePreview";
import AdminPanelShell from "@/components/admin/AdminPanelShell";

/** Secondary community admin tools (org imagery, local preview). Post moderation lives in AdminCommunityPostsSection. */
export default function AdminCommunityPanel() {
  return (
    <AdminPanelShell
      panelId="community"
      title="Additional review tools"
      description="Member post approval, rejection, and publishing are in the section above. Use this area for nonprofit header image review and the moderation queue preview."
      liveHint="Org header images appear on nonprofit profile pages at /nonprofit/[ein] when approved."
    >
      <OrgHeaderImageReviewPanel canModerate />
      <hr className="adminRule" style={{ margin: "16px 0" }} />
      <ModerationQueuePreview />
    </AdminPanelShell>
  );
}
