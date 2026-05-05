"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import NonprofitCard from "@/features/nonprofits/components/NonprofitCard";
import { mapNonprofitCardRow } from "@/features/nonprofits/mappers/nonprofitCardMapper";
import { fetchTrustedResources } from "@/features/trusted-resources/api";
import { getSupabaseClient } from "@/lib/supabase/client";

const SHIELD = "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z";

export default function TrustedPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("Loading trusted resources...");

  async function loadTrusted() {
    setStatus("Loading trusted resources...");
    try {
      const data = await fetchTrustedResources(supabase);
      const next = Array.isArray(data) ? data : [];
      setRows(next);
      setStatus(next.length ? "" : "No trusted resources found.");
    } catch {
      setRows([]);
      setStatus("Unable to load trusted resources right now.");
    }
  }

  useEffect(() => {
    loadTrusted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  return (
    <AppShell activeNav="trusted" shellClassName="appShell--siteChrome" usePrimaryTopbarChrome useFooterDockChrome useTopAppStructure>
      <section className="card">
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
            Trusted organizations The Outreach Project can connect veterans, first responders, and families with.
          </p>
        </div>
        <div className="row">
          <button className="btnPrimary" type="button" onClick={loadTrusted}>
            Refresh
          </button>
        </div>
        {status ? <p>{status}</p> : null}
        <div className="results">
          {rows.map((row) => {
            const card = mapNonprofitCardRow(row, "trusted");
            return <NonprofitCard key={`trusted-route-${card.id || card.ein || card.name}`} card={card} actionMode="trustedResource" />;
          })}
        </div>
      </section>
    </AppShell>
  );
}
