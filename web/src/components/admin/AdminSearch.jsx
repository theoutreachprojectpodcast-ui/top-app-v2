"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flattenAdminNav } from "@/lib/admin/adminNavConfig";

function useDebouncedValue(value, delayMs = 280) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function AdminSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const rootRef = useRef(null);
  const debouncedQ = useDebouncedValue(q.trim(), 300);

  const flatNav = useMemo(() => flattenAdminNav(), []);

  const navResults = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return flatNav
      .filter(
        (item) =>
          item.label.toLowerCase().includes(needle) ||
          (item.keywords || []).some((k) => k.toLowerCase().includes(needle)) ||
          item.href.toLowerCase().includes(needle) ||
          (item.description || "").toLowerCase().includes(needle),
      )
      .slice(0, 12)
      .map((item) => ({
        id: `nav-${item.id}`,
        label: item.searchLabel || item.label,
        href: item.href,
        kind: "section",
        meta: "Admin section",
      }));
  }, [q, flatNav]);

  useEffect(() => {
    if (debouncedQ.length < 2) {
      setRemoteResults([]);
      setRemoteLoading(false);
      setRemoteError("");
      return undefined;
    }

    let cancelled = false;
    setRemoteLoading(true);
    setRemoteError("");

    fetch(`/api/admin/search?q=${encodeURIComponent(debouncedQ)}`, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setRemoteError(body.error || "Search unavailable.");
          setRemoteResults([]);
          return;
        }
        setRemoteResults(Array.isArray(body.results) ? body.results : []);
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteError("Search unavailable.");
          setRemoteResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) setRemoteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  const combinedResults = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const row of [...navResults, ...remoteResults]) {
      const key = `${row.kind}:${row.href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
    return out.slice(0, 20);
  }, [navResults, remoteResults]);

  const showResults = open && q.trim().length > 0;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [close]);

  return (
    <section className="adminSearch" ref={rootRef} aria-label="Site search admin">
      <label className="adminSearch__label fieldLabel" htmlFor="admin-site-search">
        Search admin content
      </label>
      <div className="adminSearch__fieldWrap">
        <input
          id="admin-site-search"
          type="search"
          className="adminConsoleInput adminSearch__input"
          placeholder="Find pages, text blocks, sponsors, resources, users, settings…"
          value={q}
          autoComplete="off"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-expanded={showResults}
          aria-controls="admin-search-results"
        />
        {q ? (
          <button type="button" className="btnSoft adminSearch__clear" onClick={() => setQ("")}>
            Clear
          </button>
        ) : null}
      </div>

      {showResults ? (
        <div id="admin-search-results" className="adminSearch__results" role="listbox">
          {remoteLoading ? <p className="adminMuted adminSearch__status">Searching…</p> : null}
          {remoteError ? <p className="adminSearch__error">{remoteError}</p> : null}
          {!remoteLoading && combinedResults.length === 0 ? (
            <p className="adminMuted adminSearch__status">No matches for “{q.trim()}”.</p>
          ) : null}
          {combinedResults.map((row) => (
            <Link
              key={row.id}
              href={row.href}
              className="adminSearch__result"
              role="option"
              onClick={() => {
                setQ("");
                close();
              }}
            >
              <span className="adminSearch__resultLabel">{row.label}</span>
              {row.meta ? <span className="adminSearch__resultMeta adminMuted">{row.meta}</span> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
