import { createPlatformNotification } from "@/server/notifications/notificationService";

/**
 * Apply moderator/admin decision to a community post row patch.
 * @param {string} action approve | reject | hide
 * @param {Record<string, unknown>} body
 * @param {string} reviewerId WorkOS user id
 */
export function buildCommunityModerationPatch(action, body, reviewerId) {
  const now = new Date().toISOString();
  const patch = {
    updated_at: now,
    reviewed_by: reviewerId,
    reviewed_at: now,
  };

  if (action === "approve") {
    patch.status = "approved";
    patch.published_at = now;
    patch.rejection_reason = null;
  } else if (action === "reject") {
    patch.status = "rejected";
    patch.published_at = null;
    patch.rejection_reason =
      String(body?.rejectionReason || body?.rejection_reason || "").trim() ||
      "Did not meet moderation guidelines.";
    patch.moderation_notes = String(body?.moderationNotes || body?.moderation_notes || "").trim() || null;
  } else if (action === "hide") {
    patch.status = "hidden";
    patch.published_at = null;
    patch.moderation_notes = String(body?.moderationNotes || body?.moderation_notes || "").trim() || null;
  } else {
    return null;
  }

  return patch;
}

/** Notify author when a member story is approved. */
export async function notifyAuthorPostApproved(admin, existingPost, postId) {
  const authorProfileId = existingPost?.author_profile_id;
  if (!authorProfileId) return;

  const snippet = String(existingPost.title || existingPost.body || "").trim().slice(0, 120);
  await createPlatformNotification(admin, {
    recipientProfileId: authorProfileId,
    audienceScope: "user",
    type: "community_post_approved",
    title: "Your community story is live",
    message: snippet
      ? `“${snippet}${snippet.length >= 120 ? "…" : ""}” is now visible in the community feed.`
      : "Your post was approved and is visible in the community feed.",
    linkPath: "/community",
    entityType: "community_post",
    entityId: postId,
    metadata: { post_id: postId },
  });
}
