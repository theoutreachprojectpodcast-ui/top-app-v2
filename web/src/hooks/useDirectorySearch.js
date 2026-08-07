"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PAGE_SIZE } from "@/lib/constants";
import { fetchDirectorySearch } from "@/features/directory/api";
import {
  formatDirectoryCountUnavailableStatus,
  formatDirectoryFoundStatus,
  formatDirectorySearchingStatus,
} from "@/features/directory/formatDirectoryStatus";
import { resolveStateFilterCode, stateLabel } from "@/lib/utils";

const DIR_STORAGE = "top-directory-session-v1";

function readDirSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      sessionStorage.getItem(DIR_STORAGE) ||
      sessionStorage.getItem("torp-directory-session-v1");
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

export function useDirectorySearch(supabase, { preferredState = "" } = {}) {
  const restoredRef = useRef(false);
  const bootstrappedRef = useRef(false);
  const runSearchRef = useRef(null);
  const searchGenRef = useRef(0);
  const preferredStateRef = useRef(preferredState);
  preferredStateRef.current = preferredState;

  const [filters, setFilters] = useState({ ...defaultFilters });
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("");
  const [meta, setMeta] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);

  const runSearch = useCallback(
    async (nextPage = 1, overrideFilters = null) => {
      const f = overrideFilters && typeof overrideFilters === "object" ? overrideFilters : filters;
      const gen = ++searchGenRef.current;
      const label = stateLabel(f.state);

      if (!f.state) {
        setStatus("Please select a state.");
        setMeta("");
        setResults([]);
        setTotal(null);
        return;
      }

      setStatus(formatDirectorySearchingStatus(label));
      setMeta("");
      setPage(nextPage);
      setTotal(null);

      try {
        const { rows, count, from } = await fetchDirectorySearch(supabase, f, nextPage);
        if (gen !== searchGenRef.current) return;

        setResults(rows);
        setTotal(typeof count === "number" ? count : null);

        const found = formatDirectoryFoundStatus(count, { stateLabel: label });
        if (found) {
          setStatus(found);
        } else {
          // Search finished but count failed — never leave "calculating…" stuck.
          setStatus(formatDirectoryCountUnavailableStatus(label));
          if (typeof console !== "undefined" && console.warn) {
            console.warn("[directory] search returned without a usable total count");
          }
        }

        if (!rows.length) {
          setMeta("");
          return;
        }

        const start = from + 1;
        const end = from + rows.length;
        setMeta(`Displaying ${start.toLocaleString()}-${end.toLocaleString()} • Page ${nextPage}`);
        writeDirSession(f, nextPage);
      } catch (err) {
        if (gen !== searchGenRef.current) return;
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[directory] search failed:", err?.message || err);
        }
        setStatus("Search temporarily unavailable. Please try again.");
        setMeta("");
        setResults([]);
        setTotal(null);
      }
    },
    [supabase, filters]
  );

  runSearchRef.current = runSearch;

  const clearSearch = useCallback(() => {
    searchGenRef.current += 1;
    setFilters({ ...defaultFilters });
    setResults([]);
    setStatus("");
    setMeta("");
    setPage(1);
    setTotal(null);
    clearDirSession();
  }, []);

  /**
   * Restore from sessionStorage once when Supabase client is ready — not on every filter/runSearch change.
   * (Depending on runSearch previously re-applied storage and overwrote in-progress filter edits.)
   */
  useEffect(() => {
    if (!supabase) return;
    if (restoredRef.current) return;
    restoredRef.current = true;

    const s = readDirSession();
    if (s?.filters?.state) {
      setFilters(s.filters);
      const nextPage = typeof s.page === "number" && s.page >= 1 ? s.page : 1;
      setPage(nextPage);
      void runSearchRef.current?.(nextPage, s.filters);
      return;
    }

    const stateCode = resolveStateFilterCode(preferredStateRef.current);
    if (!stateCode || bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const f = { ...defaultFilters, state: stateCode };
    setFilters(f);
    void runSearchRef.current?.(1, f);
  }, [supabase]);

  /** When profile state hydrates after mount, run an initial directory search (no category required). */
  useEffect(() => {
    if (!supabase || bootstrappedRef.current) return;
    const stateCode = resolveStateFilterCode(preferredState);
    if (!stateCode) return;

    const s = readDirSession();
    if (s?.filters?.state) {
      bootstrappedRef.current = true;
      return;
    }

    bootstrappedRef.current = true;
    const f = { ...defaultFilters, state: stateCode };
    setFilters(f);
    void runSearchRef.current?.(1, f);
  }, [supabase, preferredState]);

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
