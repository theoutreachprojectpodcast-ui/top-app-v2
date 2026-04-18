"use client";

import { useMemo, useState } from "react";
import Avatar from "@/components/shared/Avatar";
import {
  getConnectionState,
  sendConnectionRequest,
} from "@/features/community/api/communityApi";
import { COMMUNITY_FOLLOWS_SEED, COMMUNITY_MEMBERS_SEED } from "@/features/community/data/communitySeed";

function followingCount(memberId) {
  return COMMUNITY_FOLLOWS_SEED.filter((f) => f.followerId === memberId).length;
}

export default function CommunityConnectionsPanel({ userId, onOpenMember }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(0);

  const members = useMemo(() => COMMUNITY_MEMBERS_SEED.map((m) => ({
    ...m,
    followingCount: followingCount(m.id),
  })), []);

  const matches = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return members.slice(0, 4);
    return members.filter((m) => {
      const haystack = `${m.name} ${m.role} ${m.tagline}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [members, search, version]);

  const preview = members.slice(0, 3);

  return (
    <section className="card communitySection communityConnectionsPanel">
      <div className="communitySectionHead">
        <h3>Member connections</h3>
        <button
          type="button"
          className="btnSoft communityCollapseBtn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </div>
      <div className="communityConnectionsPreview">
        <div className="communityConnectionsPreviewAvatars">
          {preview.map((m) => (
            <Avatar key={m.id} src={m.avatar_url || "/assets/top_profile_circle_1024.png"} alt={m.name} className="communityMemberAvatarImg" />
          ))}
        </div>
        <p>{members.length} demo members available</p>
      </div>

      {open ? (
        <div className="communityConnectionsBody">
          <div className="communitySearchBar">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find members by name, role, or tagline"
            />
          </div>
          <div className="communitySearchResults">
            {matches.map((m) => {
              const state = getConnectionState(userId, m.id, COMMUNITY_FOLLOWS_SEED);
              const isSelf = String(m.id) === String(userId);
              return (
                <div key={m.id} className="communitySearchResultRow">
                  <button type="button" className="communityMemberMini communityMemberMiniBtn" onClick={() => onOpenMember?.(m.id)}>
                    <Avatar src={m.avatar_url || "/assets/top_profile_circle_1024.png"} alt={m.name} className="communityMemberAvatarImg" />
                    <div>
                      <strong>{m.name}</strong>
                      <p>{m.role} · Following {m.followingCount}</p>
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
            {!matches.length ? <p className="communityFeedStatus">No members match this search yet.</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

