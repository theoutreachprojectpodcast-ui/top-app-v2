"use client";

import { useState } from "react";
import { fetchTrustedResources, getTrustedSlice } from "@/features/trusted-resources/api";

export function useTrustedResources(supabase) {
  const [trusted, setTrusted] = useState([]);
  const [trustedOffset, setTrustedOffset] = useState(0);
  const [trustedStatus, setTrustedStatus] = useState("");
  const [trustedCache, setTrustedCache] = useState([]);

  async function loadTrusted(reset = false) {
    if (!supabase) {
      setTrustedStatus("Supabase client not initialized.");
      if (reset) {
        setTrusted([]);
        setTrustedCache([]);
        setTrustedOffset(0);
      }
      return;
    }
    setTrustedStatus("Loading trusted resources…");

    let cache = trustedCache;
    let offset = reset ? 0 : trustedOffset;

    if (!cache.length || reset) {
      try {
        cache = await fetchTrustedResources(supabase);
        setTrustedCache(cache);
      } catch {
        if (reset) {
          setTrusted([]);
          setTrustedCache([]);
          setTrustedOffset(0);
        }
        setTrustedStatus("Unable to load trusted resources right now.");
        return;
      }
    }

    const slice = getTrustedSlice(cache, offset);
    if (!slice.length) {
      setTrustedStatus(offset === 0 ? "No trusted resources found yet." : "No more trusted resources.");
      return;
    }

    setTrusted((prev) => (reset ? slice : [...prev, ...slice]));
    setTrustedOffset(offset + slice.length);
    setTrustedStatus("");
  }

  return {
    trusted,
    trustedStatus,
    loadTrusted,
  };
}
