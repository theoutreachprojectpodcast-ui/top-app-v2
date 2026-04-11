"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import IconWrap from "@/components/shared/IconWrap";

const BELL_PATH =
  "M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11a6 6 0 1 0-12 0v5H4v2h16v-2h-2z";

async function fetchJson(url, options) {
  const res = await fetch(url, { credentials: "include", ...options });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export default function HeaderNotificationBell({ variant = "topbar", skipSessionGate = false } = {}) {
  const router = useRouter();
  const session = useAuthSession();
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  const refreshSummary = useCallback(async () => {
    if (!skipSessionGate && !session.authenticated) {
      setUnreadCount(0);
      return;
    }
    const { ok, data } = await fetchJson("/api/me/notifications?summary=1");
    if (ok && typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
  }, [session.authenticated, skipSessionGate]);

  const loadList = useCallback(async () => {
    if (!skipSessionGate && !session.authenticated) return;
    setLoading(true);
    setListError("");
    const { ok, data } = await fetchJson("/api/me/notifications?limit=12");
    setLoading(false);
    if (!ok) {
      setListError(data?.error || "Could not load notifications.");
      return;
    }
    setItems(Array.isArray(data.notifications) ? data.notifications : []);
    if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
  }, [session.authenticated, skipSessionGate]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary, session.loading]);

  useEffect(() => {
    if (!skipSessionGate && !session.authenticated) return;
    const t = setInterval(() => void refreshSummary(), 90000);
    return () => clearInterval(t);
  }, [session.authenticated, skipSessionGate, refreshSummary]);

  useEffect(() => {
    if (!open) return;
    void loadList();
  }, [open, loadList]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(ids) {
    if (!ids?.length) return;
    await fetchJson("/api/me/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    void refreshSummary();
  }

  async function markAllRead() {
    await fetchJson("/api/me/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, status: "read", read_at: n.read_at || new Date().toISOString() })));
    setUnreadCount(0);
  }

  async function onItemActivate(n) {
    if (n.status === "unread" && n.id) await markRead([n.id]);
    const path = n.link_path ? String(n.link_path) : "";
    setOpen(false);
    if (path.startsWith("/")) router.push(path);
    else if (path) window.location.assign(path);
  }

  if (!skipSessionGate && (session.loading || !session.authenticated)) return null;

  const btnClass =
    variant === "subpage"
      ? "btnSoft sponsorBtn headerNotificationBellBtn headerNotificationBellBtn--subpage"
      : "headerNotificationBellBtn";

  return (
    <div className="headerNotificationWrap" ref={wrapRef}>
      <button
        type="button"
        className={btnClass}
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="headerNotificationBellIcon" aria-hidden="true">
          <IconWrap path={BELL_PATH} />
        </span>
        {unreadCount > 0 ? (
          <span className="headerNotificationBadge" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="headerNotificationDropdown" role="dialog" aria-label="Notifications">
          <div className="headerNotificationDropdown__head">
            <span className="headerNotificationDropdown__title">Notifications</span>
            {unreadCount > 0 ? (
              <button type="button" className="headerNotificationMarkAll" onClick={() => void markAllRead()}>
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="headerNotificationDropdown__body">
            {loading ? <p className="headerNotificationEmpty">Loading…</p> : null}
            {!loading && listError ? <p className="headerNotificationError">{listError}</p> : null}
            {!loading && !listError && !items.length ? (
              <p className="headerNotificationEmpty">You are all caught up.</p>
            ) : null}
            {!loading && !listError
              ? items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`headerNotificationItem ${n.status === "unread" ? "isUnread" : ""}`}
                    onClick={() => void onItemActivate(n)}
                  >
                    <span className="headerNotificationItem__title">{n.title}</span>
                    {n.message ? <span className="headerNotificationItem__msg">{n.message}</span> : null}
                    <span className="headerNotificationItem__meta">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                    </span>
                  </button>
                ))
              : null}
          </div>
          <div className="headerNotificationDropdown__foot">
            <Link href="/notifications" className="headerNotificationViewAll" onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
