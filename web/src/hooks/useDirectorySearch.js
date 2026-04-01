"use client";

import { useState } from "react";
import { PAGE_SIZE } from "@/lib/constants";
import { searchDirectory } from "@/lib/directory";
import { stateLabel } from "@/lib/utils";

export function useDirectorySearch(supabase) {
  const [filters, setFilters] = useState({ state: "", q: "", service: "", audience: "all" });
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("");
  const [meta, setMeta] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);

  async function runSearch(nextPage = 1) {
    if (!supabase) {
      setStatus("Supabase client not initialized.");
      setMeta("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    if (!filters.state) {
      setStatus("Please select a state.");
      setMeta("");
      setResults([]);
      return;
    }

    setStatus("Searching...");
    setMeta("");
    setPage(nextPage);

    try {
      const { rows, count, from } = await searchDirectory(supabase, filters, nextPage);
      setResults(rows);
      setTotal(count);

      if (!rows.length) {
        setStatus(`No organizations found in ${stateLabel(filters.state)}.`);
        setMeta("");
        return;
      }

      const start = from + 1;
      const end = from + rows.length;
      setStatus(
        typeof count === "number"
          ? `${stateLabel(filters.state)} — ${count.toLocaleString()} organizations found`
          : `${stateLabel(filters.state)} — calculating total...`
      );
      setMeta(`Displaying ${start.toLocaleString()}-${end.toLocaleString()} • Page ${nextPage}`);
    } catch {
      setStatus("Search failed. Please try again.");
      setMeta("");
      setResults([]);
    }
  }

  function clearSearch() {
    setFilters({ state: "", q: "", service: "", audience: "all" });
    setResults([]);
    setStatus("");
    setMeta("");
    setPage(1);
    setTotal(null);
  }

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
