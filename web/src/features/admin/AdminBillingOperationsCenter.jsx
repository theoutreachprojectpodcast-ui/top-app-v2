"use client";

import { useCallback, useEffect, useState } from "react";
import AdminBillingPanel from "@/features/admin/AdminBillingPanel";

export default function AdminBillingOperationsCenter() {
  const [scenario, setScenario] = useState("expected");
  const [memberGrowth, setMemberGrowth] = useState("3");
  const [churn, setChurn] = useState("2");
  const [sponsorGrowth, setSponsorGrowth] = useState("5");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("revenue");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        scenario,
        memberGrowth,
        churn,
        sponsorGrowth,
      });
      const res = await fetch(`/api/admin/billing/operations?${params}`, { credentials: "include", cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not load billing operations.");
        return;
      }
      setData(body);
    } catch {
      setError("Could not load billing operations.");
    } finally {
      setLoading(false);
    }
  }, [scenario, memberGrowth, churn, sponsorGrowth]);

  useEffect(() => {
    void load();
  }, [load]);

  const rev = data?.revenue || {};
  const sub = data?.subscriptions || {};

  return (
    <>
      <div className="adminPanel">
        <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 700 }}>
          Billing & revenue operations
        </h1>
        <p className="adminMuted" style={{ lineHeight: 1.55 }}>
          {data?.disclaimer ||
            "Operational visibility only—not audited financial statements. Card data is never shown in admin."}
        </p>

        <div className="adminToolbar" style={{ marginTop: 12 }}>
          <button type="button" className={tab === "revenue" ? "btnPrimary" : "btnSoft"} onClick={() => setTab("revenue")}>
            Revenue & forecast
          </button>
          <button type="button" className={tab === "transactions" ? "btnPrimary" : "btnSoft"} onClick={() => setTab("transactions")}>
            Transactions
          </button>
          <button type="button" className={tab === "invoices" ? "btnPrimary" : "btnSoft"} onClick={() => setTab("invoices")}>
            Invoice tools
          </button>
        </div>

        {tab === "revenue" ? (
          <>
            <div className="adminToolbar" style={{ marginTop: 16 }}>
              <label className="fieldLabel">Scenario</label>
              <select className="adminConsoleInput" value={scenario} onChange={(e) => setScenario(e.target.value)}>
                <option value="conservative">Conservative</option>
                <option value="expected">Expected</option>
                <option value="aggressive">Aggressive</option>
              </select>
              <label className="fieldLabel">Member growth %/mo</label>
              <input className="adminConsoleInput" value={memberGrowth} onChange={(e) => setMemberGrowth(e.target.value)} />
              <label className="fieldLabel">Churn %/mo</label>
              <input className="adminConsoleInput" value={churn} onChange={(e) => setChurn(e.target.value)} />
              <label className="fieldLabel">Sponsor growth %/mo</label>
              <input className="adminConsoleInput" value={sponsorGrowth} onChange={(e) => setSponsorGrowth(e.target.value)} />
              <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>
                Apply
              </button>
            </div>

            {error ? <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>{error}</p> : null}
            {loading ? <p className="adminMuted">Loading…</p> : null}

            {!loading && data ? (
              <>
                <div className="adminDashboardGrid" style={{ marginTop: 16 }}>
                  <div className="adminDashboardCard">
                    <span className="adminMuted">MRR (estimate)</span>
                    <span className="adminDashboardStat">${rev.mrrUsd}</span>
                  </div>
                  <div className="adminDashboardCard">
                    <span className="adminMuted">ARR (estimate)</span>
                    <span className="adminDashboardStat">${rev.arrUsd}</span>
                  </div>
                  <div className="adminDashboardCard">
                    <span className="adminMuted">Active subscriptions</span>
                    <span className="adminDashboardStat">{sub.active}</span>
                  </div>
                  <div className="adminDashboardCard">
                    <span className="adminMuted">Failed / past due</span>
                    <span className="adminDashboardStat">{sub.failed}</span>
                  </div>
                </div>

                <h2 style={{ fontSize: "1rem", marginTop: 24 }}>12-month membership forecast</h2>
                <div className="adminForecastChart" role="img" aria-label="Membership MRR forecast">
                  {(data.forecasts?.membership || []).map((pt) => (
                    <div
                      key={pt.month}
                      className="adminForecastBar"
                      style={{
                        height: `${Math.max(8, Math.min(120, (pt.mrr / (data.forecasts.membership[12]?.mrr || 1)) * 100))}px`,
                      }}
                      title={`Month ${pt.month}: $${pt.mrr}`}
                    />
                  ))}
                </div>

                <h2 style={{ fontSize: "1rem", marginTop: 20 }}>Sponsor revenue forecast (illustrative)</h2>
                <div className="adminForecastChart" role="img" aria-label="Sponsor revenue forecast">
                  {(data.forecasts?.sponsors || []).slice(0, 13).map((pt) => (
                    <div
                      key={pt.month}
                      className="adminForecastBar adminForecastBar--sponsor"
                      style={{
                        height: `${Math.max(8, Math.min(120, (pt.revenue / (data.forecasts.sponsors[12]?.revenue || 1)) * 100))}px`,
                      }}
                      title={`Month ${pt.month}: $${pt.revenue}`}
                    />
                  ))}
                </div>

                <h2 style={{ fontSize: "1rem", marginTop: 24 }}>Stripe integration</h2>
                <ul className="adminMuted" style={{ lineHeight: 1.7 }}>
                  <li>Secret key: {data.stripeIntegration?.secretConfigured ? "yes" : "no"}</li>
                  <li>Member recurring: {data.stripeIntegration?.memberRecurring ? "yes" : "no"}</li>
                  <li>Webhook: {data.stripeIntegration?.webhook ? "yes" : "no"}</li>
                  <li>Flows: {(data.stripeIntegration?.capabilities || []).join(", ")}</li>
                </ul>
              </>
            ) : null}
          </>
        ) : null}

        {tab === "transactions" && data?.transactions ? (
          <div className="adminTableWrap" style={{ marginTop: 16 }}>
            <table className="adminTable">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((r) => (
                  <tr key={r.id}>
                    <td>{r.recipient}</td>
                    <td>${r.amountUsd}</td>
                    <td>{r.status}</td>
                    <td>{r.reason}</td>
                    <td>{String(r.createdAt || "").slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {tab === "invoices" ? <AdminBillingPanel /> : null}
    </>
  );
}
