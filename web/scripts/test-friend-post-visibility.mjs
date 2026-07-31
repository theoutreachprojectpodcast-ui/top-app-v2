/**
 * Visibility helpers for friends-only community posts.
 * Usage: node --import ./scripts/register-at-alias.mjs scripts/test-friend-post-visibility.mjs
 */
import assert from "node:assert/strict";

function visibleVisibilitiesForViewer({ isSelf, isFriend }) {
  if (isSelf || isFriend) return ["community", "public", "friends"];
  return ["community", "public"];
}

function canViewerSeePost(post, { viewerProfileId, friendIds }) {
  const visibility = String(post?.visibility || "community").toLowerCase();
  const author = String(post?.author_profile_id || "").trim();
  const viewer = String(viewerProfileId || "").trim();
  if (!author || String(post?.status || "") !== "approved" || post?.deleted_at) return false;
  if (visibility === "private") return author === viewer;
  if (visibility === "friends") {
    return author === viewer || (friendIds instanceof Set && friendIds.has(author));
  }
  return visibility === "community" || visibility === "public";
}

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

assert.deepEqual(visibleVisibilitiesForViewer({ isSelf: false, isFriend: false }), [
  "community",
  "public",
]);
assert.deepEqual(visibleVisibilitiesForViewer({ isSelf: false, isFriend: true }), [
  "community",
  "public",
  "friends",
]);
assert.deepEqual(visibleVisibilitiesForViewer({ isSelf: true, isFriend: false }), [
  "community",
  "public",
  "friends",
]);

const friendsPost = {
  author_profile_id: A,
  visibility: "friends",
  status: "approved",
  deleted_at: null,
};
assert.equal(canViewerSeePost(friendsPost, { viewerProfileId: B, friendIds: new Set([A]) }), true);
assert.equal(canViewerSeePost(friendsPost, { viewerProfileId: C, friendIds: new Set() }), false);
assert.equal(canViewerSeePost(friendsPost, { viewerProfileId: A, friendIds: new Set() }), true);

const communityPost = {
  author_profile_id: A,
  visibility: "community",
  status: "approved",
  deleted_at: null,
};
assert.equal(canViewerSeePost(communityPost, { viewerProfileId: C, friendIds: new Set() }), true);

const privatePost = {
  author_profile_id: A,
  visibility: "private",
  status: "approved",
  deleted_at: null,
};
assert.equal(canViewerSeePost(privatePost, { viewerProfileId: B, friendIds: new Set([A]) }), false);
assert.equal(canViewerSeePost(privatePost, { viewerProfileId: A, friendIds: new Set() }), true);

console.log("test-friend-post-visibility: ok");
