"use client";

import { useEffect, useMemo, useState } from "react";
import { DEMO_MODE, FAV_KEY, PROFILE_KEY } from "@/lib/constants";
import { loadJson, saveJson } from "@/lib/storage";
import { defaultProfile } from "@/lib/utils";

export function useProfileMembership() {
  const [profile, setProfile] = useState(() => {
    const stored = loadJson(PROFILE_KEY, null);
    return stored ? { ...defaultProfile(), ...stored } : defaultProfile();
  });
  const [favs, setFavs] = useState(() => loadJson(FAV_KEY, []));

  const isMember = useMemo(() => String(profile.tier).toLowerCase() === "member", [profile.tier]);

  useEffect(() => {
    saveJson(PROFILE_KEY, profile);
  }, [profile]);

  useEffect(() => {
    saveJson(FAV_KEY, favs.slice(0, 500));
  }, [favs]);

  function toggleFav(ein) {
    const id = String(ein);
    setFavs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  }

  async function becomeMember() {
    if (DEMO_MODE) await new Promise((r) => setTimeout(r, 700));
    setProfile((p) => ({ ...p, tier: "member" }));
  }

  function resetDemo() {
    setProfile(defaultProfile());
    setFavs([]);
  }

  return {
    profile,
    setProfile,
    favs,
    setFavs,
    isMember,
    toggleFav,
    becomeMember,
    resetDemo,
  };
}

