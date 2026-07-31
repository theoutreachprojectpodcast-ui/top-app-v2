"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function formatRequestDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function ConnectionPersonRow({ person, subtitle, onOpen, actions }) {
  return (
    <div className="communitySearchResultRow">
      <button type="button" className="communityMemberMini communityMemberMiniBtn" onClick={onOpen}>
        <Avatar
          src={memberAvatarSrc(person)}
          alt={person?.name || "Member"}
          className="communityMemberAvatarImg"
        />
        <div>
          <strong>{person?.name || "Member"}</strong>
          <p>{subtitle}</p>
        </div>
      </button>
      {actions ? <div className="row wrap communityConnectionActions">{actions}</div> : null}
    </div>
  );
}

export default function CommunityConnectionsPanel({
  userId,
  viewerProfileId = "",
  refreshKey = 0,
  onOpenMember,
  focusRequests = false,
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectionsError, setConnectionsError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [bundle, setBundle] = useState(null);
  const [version, setVersion] = useState(0);
  const [panelOpen, setPanelOpen] = useState(Boolean(focusRequests));
  const requestsRef = useRef(null);

  const stateMap = useMemo(() => connectionStateMapFromBundle(bundle), [bundle]);

  useEffect(() => {
    if (focusRequests) setPanelOpen(true);
  }, [focusRequests]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      setConnectionsError("");
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
      if (connectionResult.ok) {
        setBundle(connectionResult);
        if ((connectionResult.incoming || []).length > 0 || focusRequests) {
          setPanelOpen(true);
        }
      } else {
        setBundle(null);
        setConnectionsError(
          connectionResult.error === "membership_required"
            ? "Pro membership is required to manage connections."
            : connectionResult.error === "profile_required"
              ? "Your profile is still setting up. Refresh in a moment to manage connections."
              : "Could not load your connections. Try again.",
        );
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, version, refreshKey, focusRequests]);

  useEffect(() => {
    if (!focusRequests || loading) return;
    const node = requestsRef.current;
    if (!node) return;
    window.requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [focusRequests, loading, bundle?.incoming?.length]);

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

  const preview = useMemo(() => {
    const connected = (bundle?.connected || [])
      .map((row) => row.other)
      .filter(Boolean)
      .slice(0, 3);
    if (connected.length) return connected;
    return members.slice(0, 3);
  }, [bundle, members]);

  const incomingCount = bundle?.incoming?.length || 0;
  const outgoingCount = bundle?.outgoing?.length || 0;
  const connectedCount = bundle?.connected?.length || 0;
  const summary = loading
    ? "Loading members…"
    : connectionsError
      ? "Connections unavailable"
      : [
          `${connectedCount} friend${connectedCount === 1 ? "" : "s"}`,
          incomingCount ? `${incomingCount} incoming` : "",
          outgoingCount ? `${outgoingCount} outgoing` : "",
          total ? `${total} member${total === 1 ? "" : "s"}` : "",
        ]
          .filter(Boolean)
          .join(" · ");

  const showRequestsCard = !connectionsError && (incomingCount > 0 || outgoingCount > 0 || focusRequests);

  return (
    <div className="communityConnectionsStack">
      {showRequestsCard ? (
        <section
          ref={requestsRef}
          id="community-connection-requests"
          className="card communitySection communityConnectionsRequestsCard"
          aria-label="Connection requests"
        >
          <div className="communitySectionHead">
            <h3>Connection requests</h3>
            {incomingCount > 0 ? (
              <span className="communityApprovedPill">
                {incomingCount} to review
              </span>
            ) : null}
          </div>

          {incomingCount > 0 ? (
            <div className="communityIncomingRequests" aria-label="Incoming connection requests">
              {(bundle?.incoming || []).map((row) => {
                const when = formatRequestDate(row.createdAt);
                const detail = [row.other?.role, row.other?.location, when ? `Sent ${when}` : ""]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <ConnectionPersonRow
                    key={row.id}
                    person={row.other}
                    subtitle={detail || "Wants to connect"}
                    onOpen={() => onOpenMember?.(row.otherProfileId)}
                    actions={
                      <>
                        <button
                          type="button"
                          className="btnPrimary"
                          disabled={busyId === row.id || busyId === row.otherProfileId}
                          onClick={() => void runConnectionAction("accept", row.otherProfileId, row.id)}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="btnSoft"
                          disabled={busyId === row.id || busyId === row.otherProfileId}
                          onClick={() => void runConnectionAction("decline", row.otherProfileId, row.id)}
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          className="btnSoft"
                          onClick={() => onOpenMember?.(row.otherProfileId)}
                        >
                          View Profile
                        </button>
                      </>
                    }
                  />
                );
              })}
            </div>
          ) : (
            <p className="communityFeedStatus">No incoming requests right now.</p>
          )}

          {outgoingCount > 0 ? (
            <div className="communityOutgoingRequests">
              <h4 className="communityFeedBandTitle">Outgoing requests</h4>
              {bundle.outgoing.map((row) => (
                <ConnectionPersonRow
                  key={row.id}
                  person={row.other}
                  subtitle="Request sent — waiting for them to accept"
                  onOpen={() => onOpenMember?.(row.otherProfileId)}
                  actions={
                    <button
                      type="button"
                      className="btnSoft"
                      disabled={busyId === row.id || busyId === row.otherProfileId}
                      onClick={() => void runConnectionAction("cancel", row.otherProfileId, row.id)}
                    >
                      Cancel Request
                    </button>
                  }
                />
              ))}
            </div>
          ) : null}
          {actionMessage ? <p className="applyStatus">{actionMessage}</p> : null}
        </section>
      ) : null}

      <details
        className="card communitySection communityConnectionsPanel communityConnectionsDisclosure communityDisclosure"
        open={panelOpen}
        onToggle={(e) => setPanelOpen(e.currentTarget.open)}
      >
        <summary className="communityConnectionsSummary">
          <span className="communityConnectionsSummaryMain">
            <span className="communityConnectionsSummaryTitle">Friends &amp; members</span>
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
                <span
                  className={`communityConnectionsPreviewText${connectionsError ? " communityConnectionsPreviewText--error" : ""}`}
                >
                  {summary}
                </span>
              </span>
            ) : (
              <span
                className={`communityConnectionsPreview communityConnectionsPreview--solo${connectionsError ? " communityConnectionsPreview--error" : ""}`}
              >
                {summary}
              </span>
            )}
          </span>
          <span className="communityConnectionsChevron" aria-hidden="true">
            ▾
          </span>
        </summary>

        <div className="communityConnectionsBody">
          {connectionsError ? (
            <div className="communityConnectionsEmpty" role="alert">
              <p className="applyError">{connectionsError}</p>
              <button type="button" className="btnSoft" onClick={() => setVersion((v) => v + 1)}>
                Try Again
              </button>
            </div>
          ) : null}

          <div className="communityFriendsList" aria-label="Your friends">
            <h4 className="communityFeedBandTitle">Your friends</h4>
            {!loading && !connectionsError && connectedCount === 0 ? (
              <div className="communityConnectionsEmpty">
                <p className="communityFeedStatus">
                  No friends yet. Search for members below to send a connection request.
                </p>
              </div>
            ) : null}
            {(bundle?.connected || []).map((row) => {
              const subtitle =
                [row.other?.role, row.other?.location].filter(Boolean).join(" · ") || "Connected";
              return (
                <ConnectionPersonRow
                  key={row.id}
                  person={row.other}
                  subtitle={subtitle}
                  onOpen={() => onOpenMember?.(row.otherProfileId)}
                  actions={
                    <>
                      <button
                        type="button"
                        className="btnSoft"
                        onClick={() => onOpenMember?.(row.otherProfileId)}
                      >
                        View Profile
                      </button>
                      <button
                        type="button"
                        className="btnSoft"
                        disabled={busyId === row.id || busyId === row.otherProfileId}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remove your connection with ${row.other?.name || "this member"}?`,
                            )
                          ) {
                            void runConnectionAction("remove", row.otherProfileId, row.id);
                          }
                        }}
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        className="btnSoft"
                        disabled={busyId === row.id || busyId === row.otherProfileId}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Block ${row.other?.name || "this member"}? They won’t be able to send you requests.`,
                            )
                          ) {
                            void runConnectionAction("block", row.otherProfileId, row.id);
                          }
                        }}
                      >
                        Block
                      </button>
                    </>
                  }
                />
              );
            })}
          </div>

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
          {!showRequestsCard && actionMessage ? <p className="applyStatus">{actionMessage}</p> : null}

          <div className="communitySearchResults">
            {loading ? <p className="communityFeedStatus">Loading connections…</p> : null}
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
                      <span className="communityRequestPill communityRequestPill--friends">Friends</span>
                    ) : state === "requested" ? (
                      <button
                        type="button"
                        className="btnSoft"
                        disabled={busyId === m.id}
                        onClick={() => void runConnectionAction("cancel", m.id)}
                      >
                        Request Sent · Cancel
                      </button>
                    ) : state === "incoming" ? (
                      <button
                        type="button"
                        className="btnPrimary"
                        disabled={busyId === m.id}
                        onClick={() => void runConnectionAction("accept", m.id)}
                      >
                        Accept Request
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
    </div>
  );
}
