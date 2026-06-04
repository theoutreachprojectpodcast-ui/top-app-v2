"use client";

import OrgHeaderImageReviewPanel from "@/features/nonprofits/admin/OrgHeaderImageReviewPanel";
import ModerationQueuePreview from "@/features/community/components/ModerationQueuePreview";

/** Secondary community admin tools (org imagery, local preview). Post moderation lives in AdminCommunityPostsSection. */
export default function AdminCommunityPanel() {
  return (
    <div className="adminPanel">
      <h2 style={{ marginTop: 0 }}>Additional review tools</h2>
      <p className="adminMuted">
        Member post approval, rejection, and publishing are in the section above. Use this area for nonprofit header image
        review and the moderation queue preview.
      </p>
      <OrgHeaderImageReviewPanel canModerate />
      <hr className="adminRule" style={{ margin: "16px 0" }} />
      <ModerationQueuePreview />
    </div>
  );
}
