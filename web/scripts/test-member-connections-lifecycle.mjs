/**
 * In-memory lifecycle tests for member connections (send → accept → list → remove/block).
 * Usage: node --import ./scripts/register-at-alias.mjs scripts/test-member-connections-lifecycle.mjs
 */

import assert from "node:assert/strict";
import {
  acceptConnectionRequest,
  listConnectionsForViewer,
  mutateConnectionStatus,
  resetConnectionsBackendCache,
  sendConnectionRequest,
  viewerConnectionState,
} from "../src/lib/community/memberConnections.js";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function makeMemoryAdmin({ preferPrimary = true, denyPrimary = false } = {}) {
  /** @type {Map<string, Record<string, unknown>[]>} */
  const tables = new Map([
    ["member_connections", []],
    ["community_follows", []],
  ]);

  function matchesOrFilter(row, orExpr) {
    // Parse PostgREST-style: and(a.eq.x,b.eq.y),and(...)
    const text = String(orExpr || "");
    const clauses = [];
    let i = 0;
    while (i < text.length) {
      if (text.startsWith("and(", i)) {
        let depth = 0;
        let j = i;
        for (; j < text.length; j += 1) {
          if (text[j] === "(") depth += 1;
          if (text[j] === ")") {
            depth -= 1;
            if (depth === 0) {
              j += 1;
              break;
            }
          }
        }
        clauses.push(text.slice(i, j));
        if (text[j] === ",") j += 1;
        i = j;
        continue;
      }
      const next = text.indexOf(",", i);
      const end = next === -1 ? text.length : next;
      clauses.push(text.slice(i, end));
      i = next === -1 ? text.length : next + 1;
    }

    return clauses.some((clause) => {
      const andMatch = clause.match(/^and\((.+)\)$/);
      const parts = andMatch ? andMatch[1].split(",") : [clause];
      return parts.every((part) => {
        const m = part.match(/^([a-z_]+)\.(eq|like)\.(.+)$/i);
        if (!m) return false;
        const [, col, op, raw] = m;
        const expected = decodeURIComponent(raw);
        const actual = String(row[col] ?? "");
        if (op === "eq") return actual === expected;
        if (op === "like") return actual.includes(expected.replace(/%/g, ""));
        return false;
      });
    });
  }

  function makeQuery(table) {
    const state = {
      filters: [],
      orExpr: "",
      inCol: "",
      inVals: [],
      orderCol: "",
      ascending: true,
      limitN: 1000,
      single: false,
      maybeSingle: false,
      action: "select",
      payload: null,
      updatePatch: null,
    };

    const api = {
      select() {
        state.action = state.action === "insert" || state.action === "update" || state.action === "upsert" ? state.action : "select";
        return api;
      },
      insert(payload) {
        state.action = "insert";
        state.payload = payload;
        return api;
      },
      upsert(payload) {
        state.action = "upsert";
        state.payload = payload;
        return api;
      },
      update(patch) {
        state.action = "update";
        state.updatePatch = patch;
        return api;
      },
      delete() {
        state.action = "delete";
        return api;
      },
      eq(col, val) {
        state.filters.push({ col, val: String(val) });
        return api;
      },
      in(col, vals) {
        state.inCol = col;
        state.inVals = (vals || []).map(String);
        return api;
      },
      or(expr) {
        state.orExpr = expr;
        return api;
      },
      order(col, opts = {}) {
        state.orderCol = col;
        state.ascending = opts.ascending !== false;
        return api;
      },
      limit(n) {
        state.limitN = n;
        return api;
      },
      maybeSingle() {
        state.maybeSingle = true;
        return api.then ? api : Object.assign(Promise.resolve().then(() => run()), api);
      },
      then(resolve, reject) {
        return run().then(resolve, reject);
      },
    };

    async function run() {
      if (table === "member_connections" && denyPrimary) {
        return { data: null, error: { code: "42501", message: "permission denied for table member_connections" } };
      }
      if (table === "member_connections" && !preferPrimary && state.action === "select" && !state.filters.length && !state.orExpr) {
        // resolveConnectionsBackend probe
      }

      let rows = [...(tables.get(table) || [])];

      if (state.action === "insert") {
        const items = Array.isArray(state.payload) ? state.payload : [state.payload];
        const inserted = [];
        for (const item of items) {
          if (table === "member_connections") {
            const pairKey = [item.requester_profile_id, item.recipient_profile_id].sort().join(":");
            const clash = rows.some(
              (r) =>
                ["pending", "accepted", "blocked"].includes(String(r.status)) &&
                [r.requester_profile_id, r.recipient_profile_id].sort().join(":") === pairKey,
            );
            if (clash) return { data: null, error: { code: "23505", message: "duplicate key" } };
            const row = { id: crypto.randomUUID(), ...item };
            rows.push(row);
            inserted.push(row);
          } else {
            const row = { ...item };
            const exists = rows.some((r) => r.follower_id === row.follower_id && r.following_id === row.following_id);
            if (exists) return { data: null, error: { code: "23505", message: "duplicate key" } };
            rows.push(row);
            inserted.push(row);
          }
        }
        tables.set(table, rows);
        const data = state.maybeSingle ? inserted[0] || null : inserted;
        return { data, error: null };
      }

      if (state.action === "upsert") {
        const item = state.payload;
        const idx = rows.findIndex((r) => r.follower_id === item.follower_id && r.following_id === item.following_id);
        if (idx >= 0) rows[idx] = { ...rows[idx], ...item };
        else rows.push({ ...item });
        tables.set(table, rows);
        return { data: state.maybeSingle ? item : [item], error: null };
      }

      if (state.action === "update") {
        let matched = rows;
        for (const f of state.filters) matched = matched.filter((r) => String(r[f.col]) === f.val);
        if (state.inCol) matched = matched.filter((r) => state.inVals.includes(String(r[state.inCol])));
        const updated = [];
        rows = rows.map((r) => {
          if (!matched.includes(r)) return r;
          const next = { ...r, ...state.updatePatch };
          updated.push(next);
          return next;
        });
        tables.set(table, rows);
        return { data: state.maybeSingle ? updated[0] || null : updated, error: null };
      }

      if (state.action === "delete") {
        let keep = rows;
        for (const f of state.filters) keep = keep.filter((r) => String(r[f.col]) !== f.val);
        // eq chained means AND delete match — rebuild properly
        keep = rows.filter((r) => !state.filters.every((f) => String(r[f.col]) === f.val));
        tables.set(table, keep);
        return { data: null, error: null };
      }

      // select
      let selected = rows;
      for (const f of state.filters) selected = selected.filter((r) => String(r[f.col]) === f.val);
      if (state.inCol) selected = selected.filter((r) => state.inVals.includes(String(r[state.inCol])));
      if (state.orExpr) selected = selected.filter((r) => matchesOrFilter(r, state.orExpr));
      if (state.orderCol) {
        selected.sort((a, b) => {
          const av = String(a[state.orderCol] || "");
          const bv = String(b[state.orderCol] || "");
          return state.ascending ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      selected = selected.slice(0, state.limitN);
      if (state.maybeSingle) return { data: selected[0] || null, error: null };
      return { data: selected, error: null };
    }

    return api;
  }

  return {
    from(table) {
      if (table === "member_connections" && !preferPrimary && denyPrimary === false) {
        // missing table mode
        return {
          select() {
            return {
              limit() {
                return Promise.resolve({
                  data: null,
                  error: { code: "PGRST205", message: "Could not find the table" },
                });
              },
            };
          },
        };
      }
      return makeQuery(table);
    },
    _tables: tables,
  };
}

async function runPrimaryLifecycle() {
  resetConnectionsBackendCache();
  const admin = makeMemoryAdmin({ preferPrimary: true, denyPrimary: false });

  const sent = await sendConnectionRequest(admin, { viewerProfileId: A, targetProfileId: B });
  assert.equal(sent.ok, true);
  assert.equal(sent.state, "request_sent");

  const dup = await sendConnectionRequest(admin, { viewerProfileId: A, targetProfileId: B });
  assert.equal(dup.ok, true);
  assert.equal(dup.state, "request_sent");

  const self = await sendConnectionRequest(admin, { viewerProfileId: A, targetProfileId: A });
  assert.equal(self.ok, false);

  const forB = await listConnectionsForViewer(admin, B);
  assert.equal(forB.incoming.length, 1);
  assert.equal(viewerConnectionState(forB.incoming[0], B), "request_received");

  const forA = await listConnectionsForViewer(admin, A);
  assert.equal(forA.outgoing.length, 1);
  assert.equal(forA.connected.length, 0);

  const accepted = await acceptConnectionRequest(admin, {
    viewerProfileId: B,
    otherProfileId: A,
  });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.state, "connected");

  const friendsA = await listConnectionsForViewer(admin, A);
  const friendsB = await listConnectionsForViewer(admin, B);
  assert.equal(friendsA.connected.length, 1);
  assert.equal(friendsB.connected.length, 1);
  assert.equal(friendsA.incoming.length, 0);
  assert.equal(friendsB.incoming.length, 0);

  const removed = await mutateConnectionStatus(admin, {
    viewerProfileId: A,
    otherProfileId: B,
    as: "remove",
  });
  assert.equal(removed.ok, true);

  const afterRemoveA = await listConnectionsForViewer(admin, A);
  const afterRemoveB = await listConnectionsForViewer(admin, B);
  assert.equal(afterRemoveA.connected.length, 0);
  assert.equal(afterRemoveB.connected.length, 0);

  const sent2 = await sendConnectionRequest(admin, { viewerProfileId: A, targetProfileId: B });
  assert.equal(sent2.ok, true);
  const declined = await mutateConnectionStatus(admin, {
    viewerProfileId: B,
    otherProfileId: A,
    as: "decline",
  });
  assert.equal(declined.ok, true);
  assert.equal((await listConnectionsForViewer(admin, B)).incoming.length, 0);

  const sent3 = await sendConnectionRequest(admin, { viewerProfileId: A, targetProfileId: C });
  assert.equal(sent3.ok, true);
  const cancelled = await mutateConnectionStatus(admin, {
    viewerProfileId: A,
    otherProfileId: C,
    as: "cancel",
  });
  assert.equal(cancelled.ok, true);
  assert.equal((await listConnectionsForViewer(admin, C)).incoming.length, 0);

  const blocked = await mutateConnectionStatus(admin, {
    viewerProfileId: A,
    otherProfileId: B,
    as: "block",
  });
  assert.equal(blocked.ok, true);
  assert.equal(blocked.state, "blocked");
  const cannotReconnect = await sendConnectionRequest(admin, { viewerProfileId: B, targetProfileId: A });
  assert.equal(cannotReconnect.ok, false);
}

async function runFallbackWhenPrimaryDenied() {
  resetConnectionsBackendCache();
  const admin = makeMemoryAdmin({ preferPrimary: true, denyPrimary: true });

  const sent = await sendConnectionRequest(admin, { viewerProfileId: A, targetProfileId: B });
  assert.equal(sent.ok, true, "fallback should accept sends when primary is permission-denied");
  assert.equal(sent.state, "request_sent");

  const forB = await listConnectionsForViewer(admin, B);
  assert.equal(forB.incoming.length, 1);

  const accepted = await acceptConnectionRequest(admin, { viewerProfileId: B, otherProfileId: A });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.state, "connected");

  const friendsA = await listConnectionsForViewer(admin, A);
  const friendsB = await listConnectionsForViewer(admin, B);
  assert.equal(friendsA.connected.length, 1);
  assert.equal(friendsB.connected.length, 1);
}

await runPrimaryLifecycle();
await runFallbackWhenPrimaryDenied();
console.log("test-member-connections-lifecycle: ok");
