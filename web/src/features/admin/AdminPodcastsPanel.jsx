"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import PodcastGuestApplicationsAdmin from "@/features/podcasts/components/PodcastGuestApplicationsAdmin";

function reasonLabel(code) {
  const m = {
    no_episode_number: "No episode number in title/description",
    excluded_keyword: "Title/description matched clip/short/trailer filter",
    duration_below_threshold: "Shorter than minimum full-episode duration",
    shorts_url: "Shorts URL",
    missing_video_id: "Missing video id",
  };
  return m[code] || code || "—";
}

export default function AdminPodcastsPanel() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [tab, setTab] = useState("applications");
  const [episodes, setEpisodes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [editVideo, setEditVideo] = useState("");
  const [editGuest, setEditGuest] = useState({
    guest_name: "",
    organization: "",
    role_title: "",
    short_bio: "",
    discussion_summary: "",
    admin_profile_image_url: "",
    verified_for_public: false,
  });

  const loadEpisodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/podcasts/episodes", { credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(body.rows)) setEpisodes(body.rows);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/podcasts/logs", { credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (Array.isArray(body.rows)) setLogs(body.rows);
    } catch {
      setLogs([]);
    }
  }, []);

  useEffect(() => {
    if (tab === "episodes") void loadEpisodes();
    if (tab === "logs") void loadLogs();
  }, [tab, loadEpisodes, loadLogs]);

  async function runSync() {
    setSyncMsg("");
    const res = await fetch("/api/admin/podcasts/sync", { method: "POST", credentials: "include" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSyncMsg(body.error || "Sync failed");
      return;
    }
    setSyncMsg(`Synced ${body.synced || 0} rows (source: ${body.source || "?"})`);
    void loadEpisodes();
    void loadLogs();
  }

  async function setOverride(youtubeVideoId, manualOverride) {
    const res = await fetch("/api/admin/podcasts/episode-override", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ youtubeVideoId, manualOverride }),
    });
    if (!res.ok) return;
    void loadEpisodes();
  }

  async function saveFeaturedGuest() {
    if (!editVideo) return;
    const res = await fetch("/api/admin/podcasts/featured-guest", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ youtubeVideoId: editVideo, ...editGuest }),
    });
    if (res.ok) setSyncMsg("Featured guest saved.");
  }

  return (
    <div className="adminPanel">
      <h2 style={{ marginTop: 0 }}>Podcasts</h2>
      <p className="adminMuted">
        YouTube uploads pipeline, episode acceptance, featured-guest enrichment, and guest applications (platform admin).
      </p>

      <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
        <button type="button" className={tab === "applications" ? "btnPrimary" : "btnSoft"} onClick={() => setTab("applications")}>
          Applications
        </button>
        <button type="button" className={tab === "episodes" ? "btnPrimary" : "btnSoft"} onClick={() => setTab("episodes")}>
          Episodes & overrides
        </button>
        <button type="button" className={tab === "logs" ? "btnPrimary" : "btnSoft"} onClick={() => setTab("logs")}>
          Sync logs
        </button>
        <button type="button" className={tab === "featured" ? "btnPrimary" : "btnSoft"} onClick={() => setTab("featured")}>
          Featured guest edit
        </button>
      </div>

      {tab === "applications" ? (
        <PodcastGuestApplicationsAdmin supabase={supabase} />
      ) : null}

      {tab === "episodes" ? (
        <div className="podcastAdminGrid" style={{ display: "grid", gap: 16 }}>
          <div className="row wrap" style={{ gap: 8 }}>
            <button type="button" className="btnPrimary" disabled={loading} onClick={() => void runSync()}>
              Refresh podcast data (YouTube)
            </button>
            <button type="button" className="btnSoft" disabled={loading} onClick={() => void loadEpisodes()}>
              Reload table
            </button>
          </div>
          {syncMsg ? <p className="adminMuted">{syncMsg}</p> : null}
          {loading ? <p className="adminMuted">Loading…</p> : null}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th align="left">Published</th>
                  <th align="left">Decision</th>
                  <th align="left">Reason</th>
                  <th align="left">Title</th>
                  <th align="left">Override</th>
                </tr>
              </thead>
              <tbody>
                {episodes.map((row) => (
                  <tr key={row.youtube_video_id}>
                    <td style={{ padding: "6px 8px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                      {String(row.published_at || "").slice(0, 10)}
                    </td>
                    <td style={{ padding: "6px 8px", verticalAlign: "top" }}>{row.pipeline_decision || "—"}</td>
                    <td style={{ padding: "6px 8px", verticalAlign: "top" }}>{reasonLabel(row.pipeline_reason)}</td>
                    <td style={{ padding: "6px 8px", verticalAlign: "top", maxWidth: 360 }}>
                      <a href={row.youtube_url} target="_blank" rel="noreferrer">
                        {String(row.title || "").slice(0, 120)}
                      </a>
                    </td>
                    <td style={{ padding: "6px 8px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                      <button type="button" className="btnSoft" onClick={() => void setOverride(row.youtube_video_id, "include")}>
                        Force include
                      </button>{" "}
                      <button type="button" className="btnSoft" onClick={() => void setOverride(row.youtube_video_id, "exclude")}>
                        Force exclude
                      </button>{" "}
                      <button type="button" className="btnSoft" onClick={() => void setOverride(row.youtube_video_id, "clear")}>
                        Clear
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "logs" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <button type="button" className="btnSoft" onClick={() => void loadLogs()}>
            Reload logs
          </button>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {logs.map((log) => (
              <li key={log.id} style={{ marginBottom: 8 }}>
                <strong>{log.level}</strong> {log.message}{" "}
                <span className="adminMuted">{String(log.created_at || "").replace("T", " ").slice(0, 19)}</span>
                {log.meta ? <pre style={{ fontSize: 11, overflow: "auto" }}>{JSON.stringify(log.meta, null, 0).slice(0, 400)}</pre> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "featured" ? (
        <div style={{ display: "grid", gap: 12, maxWidth: 720 }}>
          <p className="adminMuted">Edit enrichment for a YouTube video id (11 characters), e.g. from the episodes table.</p>
          <label className="fieldLabel">
            YouTube video id
            <input
              className="input"
              value={editVideo}
              onChange={(e) => setEditVideo(e.target.value.trim())}
              placeholder="dQw4w9WgXcQ"
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          {[
            { key: "guest_name", multiline: false },
            { key: "organization", multiline: false },
            { key: "role_title", multiline: false },
            { key: "short_bio", multiline: true },
            { key: "discussion_summary", multiline: true },
            { key: "admin_profile_image_url", multiline: false },
          ].map(({ key, multiline }) => (
            <label key={key} className="fieldLabel">
              {key}
              {multiline ? (
                <textarea
                  className="input"
                  rows={4}
                  value={editGuest[key] || ""}
                  onChange={(e) => setEditGuest((prev) => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: "100%", marginTop: 4 }}
                />
              ) : (
                <input
                  className="input"
                  value={editGuest[key] || ""}
                  onChange={(e) => setEditGuest((prev) => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: "100%", marginTop: 4 }}
                />
              )}
            </label>
          ))}
          <label className="fieldLabel" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={!!editGuest.verified_for_public}
              onChange={(e) => setEditGuest((prev) => ({ ...prev, verified_for_public: e.target.checked }))}
            />
            Verified for public (mark editorially confirmed)
          </label>
          <button type="button" className="btnPrimary" onClick={() => void saveFeaturedGuest()}>
            Save featured guest row
          </button>
          <p className="adminMuted">Re-run “Refresh podcast data” to rebuild heuristics from the latest four valid episodes.</p>
        </div>
      ) : null}
    </div>
  );
}
