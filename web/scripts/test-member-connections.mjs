/**
 * Unit tests for member connection state helpers + lifecycle rules.
 * Usage: node --import ./scripts/register-at-alias.mjs scripts/test-member-connections.mjs
 */

import assert from "node:assert/strict";
import {
  connectionPairKey,
  connectionStateForUi,
  normalizeConnectionRow,
  viewerConnectionState,
} from "../src/lib/community/memberConnections.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

assert.equal(connectionPairKey(A, B), connectionPairKey(B, A));
assert.notEqual(connectionPairKey(A, B), connectionPairKey(A, C));

const pending = normalizeConnectionRow({
  id: "conn-1",
  requester_profile_id: A,
  recipient_profile_id: B,
  status: "pending",
  created_at: "2026-07-01T00:00:00.000Z",
});
assert.equal(viewerConnectionState(pending, A), "request_sent");
assert.equal(viewerConnectionState(pending, B), "request_received");
assert.equal(viewerConnectionState(pending, C), "none");
assert.equal(connectionStateForUi("request_sent"), "requested");
assert.equal(connectionStateForUi("request_received"), "incoming");

const accepted = normalizeConnectionRow({
  id: "conn-2",
  requester_profile_id: A,
  recipient_profile_id: B,
  status: "accepted",
});
assert.equal(viewerConnectionState(accepted, A), "connected");
assert.equal(viewerConnectionState(accepted, B), "connected");
assert.equal(connectionStateForUi("connected"), "connected");

const blocked = normalizeConnectionRow({
  id: "conn-3",
  requester_profile_id: A,
  recipient_profile_id: B,
  status: "blocked",
  blocked_by_profile_id: A,
});
assert.equal(viewerConnectionState(blocked, A), "blocked");
assert.equal(viewerConnectionState(blocked, B), "blocked");

for (const status of ["declined", "cancelled", "removed"]) {
  const row = normalizeConnectionRow({
    id: `conn-${status}`,
    requester_profile_id: A,
    recipient_profile_id: B,
    status,
  });
  assert.equal(viewerConnectionState(row, A), "none");
  assert.equal(viewerConnectionState(row, B), "none");
}

const fallbackPending = normalizeConnectionRow({
  follower_id: A,
  following_id: `pending:${B}`,
  created_at: "2026-07-01T00:00:00.000Z",
});
assert.equal(fallbackPending.status, "pending");
assert.equal(viewerConnectionState(fallbackPending, A), "request_sent");
assert.equal(viewerConnectionState(fallbackPending, B), "request_received");

const fallbackAccepted = normalizeConnectionRow({
  follower_id: A,
  following_id: B,
  created_at: "2026-07-01T00:00:00.000Z",
});
assert.equal(fallbackAccepted.status, "accepted");
assert.equal(viewerConnectionState(fallbackAccepted, A), "connected");

const fallbackBlocked = normalizeConnectionRow({
  follower_id: A,
  following_id: `blocked:${B}`,
  created_at: "2026-07-01T00:00:00.000Z",
});
assert.equal(fallbackBlocked.status, "blocked");
assert.equal(viewerConnectionState(fallbackBlocked, B), "blocked");

assert.equal(viewerConnectionState(null, A), "none");
assert.equal(connectionStateForUi("none"), "connect");

console.log("test-member-connections: ok");
