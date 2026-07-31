"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppIcon from "@/components/shared/AppIcon";
import TrustedResourceCard from "@/features/trusted-resources/components/TrustedResourceCard";
import { buildTrustedResourceViewModel } from "@/features/trusted-resources/domain/trustedResourceViewModel";
import {
  isTrustedResourceFavorited,
  toggleTrustedResourceFavorite,
} from "@/features/trusted-resources/domain/trustedFavoriteKeys";
import { fetchTrustedResources } from "@/features/trusted-resources/api";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { workosSignInLink } from "@/lib/auth/workosReturnTo";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Shell chrome (header, bottom nav, footer) comes from `trusted/layout.js` only.
 * Do not wrap with AppShell here — nested `<main class="topApp">` breaks layout and hides page content.
 *
 * Cards render from `buildTrustedResourceViewModel` + `TrustedResourceCard` (curated Trusted Resource type),
 * not generic directory `NonprofitCard` rows.
 */
export default function TrustedPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const {
    isAuthenticated,
    favoriteEins,
    favoriteEntityKeys,
    toggleFavoriteEin,
    toggleFavoriteEntityKey,
    entitlements,
  } = useProfileData();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("Loading trusted resources...");
  const [busyId, setBusyId] = useState("");
  const loadGeneration = useRef(0);

  const canSave =
    !!entitlements?.saveOrganizationsAccess ||
    !!entitlements?.isPlatformAdmin ||
    !!entitlements?.isPrivilegedStaff;

  const signInHref = workosSignInLink("/trusted", null, "/trusted");

  async function loadTrusted() {
    const gen = (loadGeneration.current += 1);
    setStatus("Loading trusted resources...");
    try {
      const data = await fetchTrustedResources(supabase);
      if (gen !== loadGeneration.current) return;
      const next = Array.isArray(data) ? data : [];
      setRows(next);
      setStatus(next.length ? "" : "No trusted resources found.");
    } catch {
      if (gen !== loadGeneration.current) return;
      setRows([]);
      setStatus("Unable to load trusted resources right now.");
    }
  }

  useEffect(() => {
    loadTrusted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const resources = useMemo(() => {
    return rows
      .map((row) => buildTrustedResourceViewModel(row))
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name);
      });
  }, [rows]);

  const onToggleFavorite = useCallback(
    (resource) => {
      setBusyId(String(resource.id || resource.trustedResourceSlug || ""));
      try {
        toggleTrustedResourceFavorite({
          resource,
          isAuthenticated,
          canSave,
          toggleFavoriteEin,
          toggleFavoriteEntityKey,
          onRequestSignIn: () => {
            window.location.assign(signInHref);
          },
        });
      } finally {
        window.setTimeout(() => setBusyId(""), 350);
      }
    },
    [isAuthenticated, canSave, toggleFavoriteEin, toggleFavoriteEntityKey, signInHref],
  );

  return (
    <section className="card trustedRouteCard">
      <div className="ds-page-intro" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
          <AppIcon name="trusted" size={108} />
          Trusted Resources
        </h2>
        <p className="ds-page-intro__lead">
          Our Trusted Resource vetting process uses structured research, human review, and service validation to evaluate
          nonprofits that serve veterans, first responders, and their families. The result is clear Trust Scores and
          evidence-based reports that help families, donors, sponsors, and community partners identify credible
          organizations with confidence.
        </p>
      </div>
      {status ? <p className="trustedRouteStatus">{status}</p> : null}
      <div className="results results--trustedBranded">
        {resources.map((resource) => {
          const id = String(resource.id || resource.trustedResourceSlug || "");
          return (
            <TrustedResourceCard
              key={`trusted-resource-${id}`}
              resource={resource}
              favoritesEnabled={isAuthenticated && canSave}
              isFavorite={isTrustedResourceFavorited(resource, favoriteEins, favoriteEntityKeys)}
              onToggleFavorite={() => onToggleFavorite(resource)}
              onRequestSignIn={
                !isAuthenticated
                  ? () => {
                      window.location.assign(signInHref);
                    }
                  : undefined
              }
              favoriteBusy={busyId === id}
            />
          );
        })}
      </div>
    </section>
  );
}
