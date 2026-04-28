"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { readRememberDevicePref } from "@/lib/auth/lastUsedEmail";
import { workosSignInLink } from "@/lib/auth/workosReturnTo";

async function fetchJson(url, options) {
  const res = await fetch(url, { credentials: "include", ...options });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export default function NotificationsPageClient() {
  const router = useRouter();
  const session = useAuthSession();
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState("");

  const loadPage = useCallback(async (cursor) => {
    const qs = new URLSearchParams({ limit: "30" });
    if (cursor) qs.set("cursor", cursor);
    const { ok, data } = await fetchJson(`/api/me/notifications?${qs}`);
    if (!ok) {
      setErr(data?.error || "Could not load notifications.");
      return { rows: [], next: null };
    }
    setErr("");
    return {
      rows: Array.isArray(data.notifications) ? data.notifications : [],
      next: data.nextCursor || null,
    };
  }, []);

  useEffect(() => {
    if (session.loading) return;
    if (!session.authenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { rows, next } = await loadPage(null);
      if (cancelled) return;
      setItems(rows);
      setNextCursor(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session.loading, session.authenticated, loadPage]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const { rows, next } = await loadPage(nextCursor);
    setItems((prev) => [...prev, ...rows]);
    setNextCursor(next);
    setLoadingMore(false);
  }

  async function markAllRead() {
    await fetchJson("/api/me/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, status: "read" })));
  }

  async function onRowClick(n) {
    if (n.status === "unread" && n.id) {
      await fetchJson("/api/me/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: "read" } : x)));
    }
    const path = n.link_path ? String(n.link_path) : "";
    if (path.startsWith("/")) router.push(path);
    else if (path) window.location.assign(path);
  }

  if (session.loading) {
    return (
      <div className="card notificationsPage">
        <p>Loading…</p>
      </div>
    );
  }

  if (!session.authenticated) {
    const workosNotificationsSignInHref = workosSignInLink("/notifications", null, "/notifications", {
      rememberDevice: readRememberDevicePref(),
    });
    return (
      <div className="card notificationsPage">
        <h1>Notifications</h1>
        <p className="sponsorSectionLead">Sign in to see your in-app notifications.</p>
        <div className="notificationsPage__actions">
          <Link className="btnPrimary" href={workosNotificationsSignInHref}>
            Sign in
          </Link>
          <Link className="btnSoft" href="/?signin=1">
            Open home sign-in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card notificationsPage">
      <h1>Notifications</h1>
      <p className="sponsorSectionLead">Updates on your account, community activity, billing, and organizations you follow.</p>
      <div className="notificationsPage__actions">
        <button type="button" className="btnSoft" onClick={() => void markAllRead()}>
          Mark all read
        </button>
        <Link className="btnSoft" href="/">
          Back to home
        </Link>
      </div>
      {loading ? <p>Loading…</p> : null}
      {err ? <p className="applyError">{err}</p> : null}
      {!loading && !err && !items.length ? <p className="sponsorSectionLead">You are all caught up.</p> : null}
      <div className="notificationsPage__list">
        {items.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`headerNotificationItem ${n.status === "unread" ? "isUnread" : ""}`}
            onClick={() => void onRowClick(n)}
          >
            <span className="headerNotificationItem__title">{n.title}</span>
            {n.message ? <span className="headerNotificationItem__msg">{n.message}</span> : null}
            <span className="headerNotificationItem__meta">
              {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
              {n.audience_scope === "staff" ? " · Team" : ""}
            </span>
          </button>
        ))}
      </div>
      {nextCursor ? (
        <div className="row" style={{ marginTop: 16 }}>
          <button type="button" className="btnSoft" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
