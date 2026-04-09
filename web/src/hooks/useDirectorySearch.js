"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PAGE_SIZE } from "@/lib/constants";
import { fetchDirectorySearch } from "@/features/directory/api";
import { stateLabel } from "@/lib/utils";

const DIR_STORAGE = "torp-directory-session-v1";

function readDirSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DIR_STORAGE);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    return o;
  } catch {
    return null;
  }
}

function writeDirSession(filters, page) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DIR_STORAGE, JSON.stringify({ filters, page }));
  } catch {
    /* ignore */
  }
}

function clearDirSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DIR_STORAGE);
  } catch {
    /* ignore */
  }
}

const defaultFilters = { state: "", q: "", service: "", audience: "all" };

export function useDirectorySearch(supabase) {
  const restoredRef = useRef(false);
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("");
  const [meta, setMeta] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);

  const runSearch = useCallback(
    async (nextPage = 1, overrideFilters = null) => {
      const f = overrideFilters && typeof overrideFilters === "object" ? overrideFilters : filters;
      if (!supabase) {
        setStatus("Supabase client not initialized.");
        setMeta("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        return;
      }
      if (!f.state) {
        setStatus("Please select a state.");
        setMeta("");
        setResults([]);
        return;
      }

      setStatus("Searching...");
      setMeta("");
      setPage(nextPage);

      try {
        const { rows, count, from } = await fetchDirectorySearch(supabase, f, nextPage);
        setResults(rows);
        setTotal(count);

        if (!rows.length) {
          setStatus(`No organizations found in ${stateLabel(f.state)}.`);
          setMeta("");
          return;
        }

        const start = from + 1;
        const end = from + rows.length;
        setStatus(
          typeof count === "number"
            ? `${stateLabel(f.state)} — ${count.toLocaleString()} organizations found`
            : `${stateLabel(f.state)} — calculating total...`
        );
        setMeta(`Displaying ${start.toLocaleString()}-${end.toLocaleString()} • Page ${nextPage}`);
        writeDirSession(f, nextPage);
      } catch {
        setStatus("Search temporarily unavailable. Please try again.");
        setMeta("");
        setResults([]);
      }
    },
    [supabase, filters]
  );

  const clearSearch = useCallback(() => {
    setFilters({ ...defaultFilters });
    setResults([]);
    setStatus("");
    setMeta("");
    setPage(1);
    setTotal(null);
    clearDirSession();
    restoredRef.current = false;
  }, []);

  useEffect(() => {
    if (restoredRef.current || !supabase) return;
    const s = readDirSession();
    if (!s?.filters?.state) return;
    restoredRef.current = true;
    setFilters(s.filters);
    setPage(typeof s.page === "number" && s.page >= 1 ? s.page : 1);
    void runSearch(s.page || 1, s.filters);
  }, [supabase, runSearch]);

  const canGoNext = total === null ? results.length === PAGE_SIZE : page * PAGE_SIZE < total;

  return {
    filters,
    setFilters,
    results,
    status,
    meta,
    page,
    total,
    canGoNext,
    setPage,
    runSearch,
    clearSearch,
  };
}
