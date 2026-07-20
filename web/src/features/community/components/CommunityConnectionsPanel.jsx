"use client";

import { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/shared/Avatar";
import {
  fetchCommunityMembers,
  getConnectionState,
  sendConnectionRequest,
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
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      const result = await fetchCommunityMembers({ q: debouncedSearch, limit: debouncedSearch ? 40 : 24 });
      if (cancelled) return;
      if (!result.ok) {
        setMembers([]);
        setTotal(0);
        setError(result.error === "membership_required" ? "Pro membership is required to browse members." : "Could not load members right now.");
      } else {
        setMembers(result.members);
        setTotal(result.total || result.members.length);
        setError("");
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, version]);

  const preview = useMemo(() => members.slice(0, 3), [members]);
  const summary = loading
    ? "Loading members…"
    : total > 0
      ? `${total} member${total === 1 ? "" : "s"} on the platform`
      : "No members match yet";

  return (
    <details className="card communitySection communityConnectionsPanel communityConnectionsDisclosure">
      <summary className="communityConnectionsSummary">
        <span className="communityConnectionsSummaryMain">
          <span className="communityConnectionsSummaryTitle">Member connections</span>
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

        <div className="communitySearchResults">
          {loading ? <p className="communityFeedStatus">Searching members…</p> : null}
          {!loading &&
            members.map((m) => {
              const state = getConnectionState(userId, m.id);
              const isSelf = memberIsSelf(m, { viewerProfileId, viewerUserId: userId });
              const subtitle = [m.role, m.location].filter(Boolean).join(" · ");
              return (
                <div key={m.id} className="communitySearchResultRow">
                  <button type="button" className="communityMemberMini communityMemberMiniBtn" onClick={() => onOpenMember?.(m.id)}>
                    <Avatar src={memberAvatarSrc(m)} alt={m.name} className="communityMemberAvatarImg" />
                    <div>
                      <strong>{m.name}</strong>
                      <p>{subtitle || m.tagline || "Community member"}</p>
                    </div>
                  </button>
                  {isSelf ? (
                    <span className="communityRequestPill">You</span>
                  ) : state === "connected" ? (
                    <span className="communityRequestPill isConnected">Connected</span>
                  ) : state === "requested" ? (
                    <span className="communityRequestPill isRequested">Requested</span>
                  ) : (
                    <button
                      type="button"
                      className="btnSoft"
                      onClick={() => {
                        sendConnectionRequest(userId, m.id);
                        setVersion((v) => v + 1);
                      }}
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
