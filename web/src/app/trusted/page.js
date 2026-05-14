"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TrustedResourceCard from "@/features/trusted-resources/components/TrustedResourceCard";
import { buildTrustedResourceViewModel } from "@/features/trusted-resources/domain/trustedResourceViewModel";
import { fetchTrustedResources } from "@/features/trusted-resources/api";
import { getSupabaseClient } from "@/lib/supabase/client";

const SHIELD = "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z";

/**
 * Shell chrome (header, bottom nav, footer) comes from `trusted/layout.js` only.
 * Do not wrap with AppShell here — nested `<main class="topApp">` breaks layout and hides page content.
 *
 * Cards render from `buildTrustedResourceViewModel` + `TrustedResourceCard` (curated Trusted Resource type),
 * not generic directory `NonprofitCard` rows.
 */
export default function TrustedPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("Loading trusted resources...");
  const loadGeneration = useRef(0);

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

  return (
    <section className="card trustedRouteCard">
      <div className="ds-page-intro" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="iconWrap" aria-hidden="true">
            <svg className="iconStroke" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d={SHIELD} />
            </svg>
          </span>
          Trusted Resources
        </h2>
        <p className="ds-page-intro__lead">
          Curated organizations The Outreach Project can connect veterans, first responders, and families with. Each
          listing uses Trusted Resource branding (hero art, logos, and links) and may still open the public directory
          profile when an IRS EIN is available.
        </p>
        <p className="trustedListingIntro">
          These cards are a dedicated Trusted Resource layout — not the general Directory grid. Curated fields (logo,
          header image, category, copy, and links) override directory defaults when present.
        </p>
      </div>
      <div className="row">
        <button className="btnPrimary" type="button" onClick={loadTrusted}>
          Refresh
        </button>
      </div>
      {status ? <p className="trustedRouteStatus">{status}</p> : null}
      <div className="results results--trustedBranded">
        {resources.map((resource) => (
          <TrustedResourceCard key={`trusted-resource-${resource.id}`} resource={resource} />
        ))}
      </div>
    </section>
  );
}
