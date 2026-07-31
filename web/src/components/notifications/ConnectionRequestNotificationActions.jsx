"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/shared/Avatar";
import { mutateConnectionApi } from "@/features/community/api/communityApi";
import { emptyProfileAvatarUrl } from "@/lib/avatarFallback";

function connectionMeta(notification) {
  const meta = notification?.metadata && typeof notification.metadata === "object" ? notification.metadata : {};
  const connectionId = String(
    notification?.entity_id || meta.connection_id || meta.connectionId || "",
  ).trim();
  const requesterProfileId = String(
    meta.requester_profile_id || meta.requesterProfileId || "",
  ).trim();
  const name = String(meta.requester_name || meta.requesterName || "").trim();
  const avatarUrl = String(meta.requester_avatar_url || meta.requesterAvatarUrl || "").trim();
  return { connectionId, requesterProfileId, name, avatarUrl };
}

export function isConnectionRequestNotification(notification) {
  return String(notification?.notification_type || notification?.type || "").trim() === "connection_request";
}

/**
 * Accept / Decline controls for connection_request notifications (bell + /notifications).
 */
export default function ConnectionRequestNotificationActions({
  notification,
  onResolved,
  compact = false,
}) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [resolved, setResolved] = useState(null);
  const { connectionId, requesterProfileId, name, avatarUrl } = connectionMeta(notification);

  if (!isConnectionRequestNotification(notification)) return null;
  if (resolved) {
    return (
      <div className={`connectionNotifActions${compact ? " connectionNotifActions--compact" : ""}`}>
        <p className="connectionNotifActions__status">{resolved}</p>
      </div>
    );
  }
  if (!connectionId && !requesterProfileId) return null;

  async function run(action) {
    setBusy(action);
    setMessage("");
    const result = await mutateConnectionApi({
      action,
      connectionId: connectionId || undefined,
      targetProfileId: requesterProfileId || undefined,
    });
    setBusy("");
    if (!result.ok) {
      setMessage(result.message || "Could not update request.");
      return;
    }
    const label = action === "accept" ? "Connected" : "Request declined";
    setResolved(result.message || label);
    onResolved?.({ action, result, notification });
  }

  const profileHref = requesterProfileId
    ? `/community?connections=1&member=${encodeURIComponent(requesterProfileId)}`
    : "/community?connections=1";

  return (
    <div
      className={`connectionNotifActions${compact ? " connectionNotifActions--compact" : ""}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {!compact ? (
        <div className="connectionNotifActions__person">
          <Avatar
            src={avatarUrl || emptyProfileAvatarUrl()}
            alt={name || "Member"}
            className="connectionNotifActions__avatar"
          />
          <div>
            <strong>{name || "Community member"}</strong>
            <p>
              <Link href={profileHref} className="connectionNotifActions__profileLink">
                View profile
              </Link>
            </p>
          </div>
        </div>
      ) : null}
      <div className="row wrap connectionNotifActions__buttons">
        <button
          type="button"
          className="btnPrimary"
          disabled={!!busy}
          onClick={() => void run("accept")}
        >
          {busy === "accept" ? "Accepting…" : "Accept"}
        </button>
        <button
          type="button"
          className="btnSoft"
          disabled={!!busy}
          onClick={() => void run("decline")}
        >
          {busy === "decline" ? "Declining…" : "Decline"}
        </button>
        {compact && requesterProfileId ? (
          <Link href={profileHref} className="btnSoft connectionNotifActions__profileBtn">
            Profile
          </Link>
        ) : null}
      </div>
      {message ? <p className="connectionNotifActions__error">{message}</p> : null}
    </div>
  );
}
