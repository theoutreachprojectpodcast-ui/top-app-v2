"use client";

import { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/shared/Avatar";
import {
  connectionStateMapFromBundle,
  fetchCommunityMembers,
  fetchConnectionsBundle,
  mutateConnectionApi,
} from "@/features/community/api/communityApi";
import { emptyProfileAvatarUrl } from "@/lib/avatarFallback";

function memberAvatarSrc(member) {
  const url = String(member?.avatar_url || "").trim();
  return url || emptyProfileAvatarUrl();
}

function memberIsSelf(member, { viewerProfileId, viewerUserId }) {
  const profileId = String(viewerProfileId || "").trim();
  const userId = String(viewerUserId || "").trim();
  if (profileId && String(member?.id || "") === profileId) return true;
  if (userId && String(member?.workosUserId || "") === userId) return true;
  return false;
}

export default function CommunityConnectionsPanel({ userId, viewerProfileId = "", onOpenMember }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [bundle, setBundle] = useState(null);
  const [version, setVersion] = useState(0);

  const stateMap = useMemo(() => connectionStateMapFromBundle(bundle), [bundle]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      const [memberResult, connectionResult] = await Promise.all([
        fetchCommunityMembers({ q: debouncedSearch, limit: debouncedSearch ? 40 : 24 }),
        fetchConnectionsBundle(),
      ]);
      if (cancelled) return;
      if (!memberResult.ok) {
        setMembers([]);
        setTotal(0);
        setError(
          memberResult.error === "membership_required"
            ? "Pro membership is required to browse members."
            : "Could not load members right now.",
        );
      } else {
        setMembers(memberResult.members);
        setTotal(memberResult.total || memberResult.members.length);
        setError("");
      }
      if (connectionResult.ok) setBundle(connectionResult);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, version]);

  async function runConnectionAction(action, targetProfileId, connectionId) {
    setBusyId(targetProfileId || connectionId || "busy");
    setActionMessage("");
    const result = await mutateConnectionApi({ action, targetProfileId, connectionId });
    setBusyId("");
    if (!result.ok) {
      setActionMessage(result.message || "Could not update connection.");
      return;
    }
    setActionMessage(result.message || "Updated.");
    setVersion((v) => v + 1);
  }

  const preview = useMemo(() => members.slice(0, 3), [members]);
  const incomingCount = bundle?.incoming?.length || 0;
  const connectedCount = bundle?.connected?.length || 0;
  const summary = loading
    ? "Loading members…"
    : total > 0
      ? `${total} member${total === 1 ? "" : "s"} · ${connectedCount} connection${connectedCount === 1 ? "" : "s"}${
          incomingCount ? ` · ${incomingCount} request${incomingCount === 1 ? "" : "s"}` : ""
        }`
      : "No members match yet";

  return (
    <details className="card communitySection communityConnectionsPanel communityConnectionsDisclosure">
      <summary className="communityConnectionsSummary">
        <span className="communityConnectionsSummaryMain">
          <span className="communityConnectionsSummaryTitle">Friend connections</span>
          {preview.length ? (
            <span className="communityConnectionsPreview">
              <span className="communityConnectionsPreviewAvatars">
                {preview.map((m) => (
                  <Avatar
                    key={m.id}
                    src={memberAvatarSrc(m)}
                    alt=""
                    className="communityMemberAvatarImg"
                  />
                ))}
              </span>
              <span className="communityConnectionsPreviewText">{summary}</span>
            </span>
          ) : (
            <span className="communityConnectionsPreview communityConnectionsPreview--solo">{summary}</span>
          )}
        </span>
        <span className="communityConnectionsChevron" aria-hidden="true">
          ▾
        </span>
      </summary>

      <div className="communityConnectionsBody">
        {incomingCount ? (
          <div className="communityIncomingRequests" aria-label="Incoming connection requests">
            <h4 className="communityFeedBandTitle">Requests waiting for you</h4>
            {bundle.incoming.map((row) => (
              <div key={row.id} className="communitySearchResultRow">
                <button
                  type="button"
                  className="communityMemberMini communityMemberMiniBtn"
                  onClick={() => onOpenMember?.(row.otherProfileId)}
                >
                  <Avatar
                    src={memberAvatarSrc(row.other)}
                    alt={row.other?.name || "Member"}
                    className="communityMemberAvatarImg"
                  />
                  <div>
                    <strong>{row.other?.name || "Member"}</strong>
                    <p>Wants to connect</p>
                  </div>
                </button>
                <div className="row wrap">
                  <button
                    type="button"
                    className="btnPrimary"
                    disabled={busyId === row.id}
                    onClick={() => void runConnectionAction("accept", row.otherProfileId, row.id)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btnSoft"
                    disabled={busyId === row.id}
                    onClick={() => void runConnectionAction("decline", row.otherProfileId, row.id)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="communitySearchBar">
          <label className="fieldLabel" htmlFor="community-member-search">
            Search members
          </label>
          <input
            id="community-member-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, bio, or location"
            autoComplete="off"
          />
        </div>

        {error ? (
          <p className="applyError" role="alert">
            {error}
          </p>
        ) : null}
        {actionMessage ? <p className="applyStatus">{actionMessage}</p> : null}

        <div className="communitySearchResults">
          {loading ? <p className="communityFeedStatus">Searching members…</p> : null}
          {!loading &&
            members.map((m) => {
              const state = stateMap[String(m.id)] || "connect";
              const isSelf = memberIsSelf(m, { viewerProfileId, viewerUserId: userId });
              const subtitle = [m.role, m.location].filter(Boolean).join(" · ");
              return (
                <div key={m.id} className="communitySearchResultRow">
                  <button
                    type="button"
                    className="communityMemberMini communityMemberMiniBtn"
                    onClick={() => onOpenMember?.(m.id)}
                  >
                    <Avatar src={memberAvatarSrc(m)} alt={m.name} className="communityMemberAvatarImg" />
                    <div>
                      <strong>{m.name}</strong>
                      <p>{subtitle || m.tagline || "Community member"}</p>
                    </div>
                  </button>
                  {isSelf ? (
                    <span className="communityRequestPill">You</span>
                  ) : state === "connected" ? (
                    <button
                      type="button"
                      className="btnSoft"
                      disabled={busyId === m.id}
                      onClick={() => {
                        if (window.confirm(`Remove your connection with ${m.name}?`)) {
                          void runConnectionAction("remove", m.id);
                        }
                      }}
                    >
                      Connected · Remove
                    </button>
                  ) : state === "requested" ? (
                    <button
                      type="button"
                      className="btnSoft"
                      disabled={busyId === m.id}
                      onClick={() => void runConnectionAction("cancel", m.id)}
                    >
                      Cancel request
                    </button>
                  ) : state === "incoming" ? (
                    <button
                      type="button"
                      className="btnPrimary"
                      disabled={busyId === m.id}
                      onClick={() => void runConnectionAction("accept", m.id)}
                    >
                      Accept
                    </button>
                  ) : state === "blocked" ? (
                    <span className="communityRequestPill">Blocked</span>
                  ) : (
                    <button
                      type="button"
                      className="btnSoft"
                      disabled={!!busyId}
                      onClick={() => void runConnectionAction("request", m.id)}
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          {!loading && !members.length && !error ? (
            <p className="communityFeedStatus">No members match this search yet.</p>
          ) : null}
        </div>
      </div>
    </details>
  );
}
