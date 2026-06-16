"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MembershipTierArt from "@/features/membership/components/MembershipTierArt";
import ManageBillingButton from "@/features/profile/components/ManageBillingButton";
import {
  navigateToStripeCheckout,
  navigateToStripeSetupUrl,
} from "@/lib/capacitor/billingNavigation";
import {
  MEMBERSHIP_TIER_KEYS,
  getMembershipTierDefinition,
  normalizeMembershipTierKey,
  PRO_MEMBERSHIP_PRICE_LABEL,
  SUPPORT_MEMBERSHIP_PRICE_LABEL,
} from "@/features/membership/membershipTiers";
import { membershipTierRank } from "@/lib/billing/membershipTierOrder";

const UPGRADE_TARGETS = {
  [MEMBERSHIP_TIER_KEYS.NONE]: ["support", "member"],
  [MEMBERSHIP_TIER_KEYS.ACCESS]: ["member"],
  [MEMBERSHIP_TIER_KEYS.SUPPORT]: ["member"],
  [MEMBERSHIP_TIER_KEYS.MEMBER]: [],
  [MEMBERSHIP_TIER_KEYS.SPONSOR]: [],
};

const DOWNGRADE_HINT =
  "Downgrades and cancellations are handled in Manage billing. You keep access through the end of your current billing period.";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatPmSummary(pm) {
  if (!pm?.last4) return null;
  const brand = pm.brand ? String(pm.brand).toUpperCase() : "CARD";
  return `${brand} •••• ${pm.last4}`;
}

/**
 * Profile Membership & Billing center — upgrades, portal, payment methods, billing history.
 */
export default function MembershipBillingCenter({
  isAuthenticated,
  sessionKind = "demo",
  currentTierKey,
  membershipBillingStatus = "none",
  stripeMemberReady = false,
  stripeCustomerReady = false,
  checkoutReturnPath = "/profile",
  onRequestSignIn,
  onCheckoutNavigate,
  /** When true, show expand/collapse control (profile page). */
  collapsible = false,
  /** Initial panel state when `collapsible` (profile defaults to collapsed). */
  defaultExpanded = true,
}) {
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const tierKey = normalizeMembershipTierKey(currentTierKey);
  const current = getMembershipTierDefinition(tierKey);
  const isWorkos = sessionKind === "workos";

  useEffect(() => {
    if (!collapsible || typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash === "membership-billing" || hash === "account-membership") {
      setExpanded(true);
    }
  }, [collapsible]);

  const load = useCallback(async () => {
    if (!isAuthenticated || !isWorkos) return;
    setLoading(true);
    setError("");
    try {
      const [sumRes, invRes, pmRes] = await Promise.all([
        fetch("/api/billing/summary", { credentials: "include", cache: "no-store" }),
        fetch("/api/billing/invoices?limit=12", { credentials: "include", cache: "no-store" }),
        fetch("/api/billing/payment-methods", { credentials: "include", cache: "no-store" }),
      ]);
      const sum = await sumRes.json().catch(() => ({}));
      const inv = await invRes.json().catch(() => ({}));
      const pm = await pmRes.json().catch(() => ({}));
      if (sumRes.ok) setSummary(sum.membership || null);
      if (invRes.ok) setInvoices(Array.isArray(inv.invoices) ? inv.invoices : []);
      if (pmRes.ok) setPaymentMethods(Array.isArray(pm.paymentMethods) ? pm.paymentMethods : []);
    } catch {
      setError("Could not load billing details.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isWorkos]);

  useEffect(() => {
    void load();
  }, [load]);

  const renewalDate = summary?.renewalDate || null;
  const cancelAtPeriodEnd = !!summary?.cancelAtPeriodEnd;
  const pmDisplay = formatPmSummary(summary?.paymentMethodSummary);

  const upgradeTiers = useMemo(() => {
    const keys = UPGRADE_TARGETS[tierKey] || [];
    return keys.map((k) => {
      const def = getMembershipTierDefinition(k);
      let price = def.priceLabel || "";
      if (k === MEMBERSHIP_TIER_KEYS.SUPPORT) price = SUPPORT_MEMBERSHIP_PRICE_LABEL;
      if (k === MEMBERSHIP_TIER_KEYS.MEMBER) price = PRO_MEMBERSHIP_PRICE_LABEL;
      return { key: k, def, price, checkoutTier: k === MEMBERSHIP_TIER_KEYS.MEMBER ? "member" : k };
    });
  }, [tierKey]);

  async function startCheckout(tier, sponsorPackageId) {
    setError("");
    setBusy(tier + (sponsorPackageId || ""));
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, returnPath: checkoutReturnPath, sponsorPackageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        onCheckoutNavigate?.();
        await navigateToStripeCheckout(data.url);
        return;
      }
      if (data.error === "use_billing_portal") {
        setError(data.message || DOWNGRADE_HINT);
        return;
      }
      if (data.error === "use_podcast_checkout" && data.podcastTierId) {
        const pr = await fetch("/api/billing/podcast-sponsor-checkout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ podcastTierId: data.podcastTierId, returnPath: checkoutReturnPath }),
        });
        const pd = await pr.json().catch(() => ({}));
        if (pd.url) {
          await navigateToStripeCheckout(pd.url);
          return;
        }
      }
      if (data.error === "use_sponsor_application") {
        const tid = data.missionTierId || "";
        window.location.assign(`/sponsors?packages=1${tid ? `&tier=${encodeURIComponent(tid)}` : ""}`);
        return;
      }
      setError(data.message || data.error || "Checkout could not start.");
    } catch {
      setError("Network error starting checkout.");
    } finally {
      setBusy("");
    }
  }

  async function addPaymentMethod() {
    setBusy("pm-add");
    setError("");
    try {
      const res = await fetch("/api/billing/payment-methods", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: checkoutReturnPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        await navigateToStripeSetupUrl(data.url);
        return;
      }
      setError(data.message || data.error || "Could not open payment setup.");
    } catch {
      setError("Network error.");
    } finally {
      setBusy("");
    }
  }

  async function setDefaultPm(id) {
    setBusy(`pm-${id}`);
    try {
      await fetch("/api/billing/payment-methods", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: id }),
      });
      await load();
    } finally {
      setBusy("");
    }
  }

  async function removePm(id) {
    if (!window.confirm("Remove this payment method?")) return;
    setBusy(`rm-${id}`);
    try {
      await fetch(`/api/billing/payment-methods?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      await load();
    } finally {
      setBusy("");
    }
  }

  const billingLabel = String(membershipBillingStatus || summary?.billingStatus || "none").replace(/_/g, " ");
  const showBody = !collapsible || expanded;
  const sectionClassName = `card membershipBillingCenter${collapsible && !expanded ? " membershipBillingCenter--collapsed" : ""}`;

  const collapseToggle = collapsible ? (
    <button
      type="button"
      className="btnSoft membershipBillingCenter__toggle"
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
      aria-controls="membership-billing-body"
    >
      {expanded ? "Collapse" : "Expand"}
    </button>
  ) : null;

  if (!isAuthenticated) {
    return (
      <section className={sectionClassName} id="membership-billing">
        <div className="membershipBillingCenter__headRow">
          <h3 className="membershipBillingCenter__title">Membership &amp; billing</h3>
          {collapseToggle}
        </div>
        {showBody ? (
          <>
            <p className="sponsorSectionLead">Sign in to manage membership, payment methods, and billing history.</p>
            <button type="button" className="btnPrimary" onClick={() => onRequestSignIn?.()}>
              Sign in
            </button>
          </>
        ) : null}
      </section>
    );
  }

  if (!isWorkos) {
    return (
      <section className={sectionClassName} id="membership-billing">
        <div className="membershipBillingCenter__headRow">
          <div className="membershipBillingCenter__head">
            <span className="membershipAtAGlanceArt membershipAtAGlanceArt--profile" aria-hidden="true">
              <MembershipTierArt tierId={tierKey} />
            </span>
            <div>
              <h3 className="membershipBillingCenter__title">Membership &amp; billing</h3>
              <p className="membershipAtAGlanceSub membershipAtAGlanceSub--profile">
                <strong>{current.label}</strong> (demo)
              </p>
            </div>
          </div>
          {collapseToggle}
        </div>
        {showBody ? (
          <p className="sponsorSectionLead">
            Sign in with a full account for Stripe billing.
          </p>
        ) : null}
      </section>
    );
  }

  const showDowngradeHint = membershipTierRank(tierKey) > 0 && stripeCustomerReady;

  return (
    <section className={sectionClassName} id="membership-billing">
      <div className="membershipBillingCenter__headRow">
        <div className="membershipBillingCenter__head">
          <span className="membershipAtAGlanceArt membershipAtAGlanceArt--profile" aria-hidden="true">
            <MembershipTierArt tierId={tierKey} />
          </span>
          <div>
            <h3 className="membershipBillingCenter__title">Membership &amp; billing</h3>
            <p className="membershipAtAGlanceSub membershipAtAGlanceSub--profile">
              <strong>{current.label}</strong> · Billing: {billingLabel}
            </p>
          </div>
        </div>
        {collapseToggle}
      </div>

      {showBody ? (
        <div id="membership-billing-body" className="membershipBillingCenter__body">
      <dl className="membershipBillingCenter__stats">
        <div>
          <dt>Renewal</dt>
          <dd>{formatDate(renewalDate)}</dd>
        </div>
        {summary?.subscriptionStatus ? (
          <div>
            <dt>Subscription</dt>
            <dd>{summary.subscriptionStatus}</dd>
          </div>
        ) : stripeCustomerReady ? (
          <div>
            <dt>Subscription</dt>
            <dd>—</dd>
          </div>
        ) : null}
        {pmDisplay ? (
          <div>
            <dt>Default card</dt>
            <dd>{pmDisplay}</dd>
          </div>
        ) : null}
      </dl>

      {cancelAtPeriodEnd ? (
        <p className="membershipBillingCenter__notice" role="status">
          Your subscription is set to cancel at the end of the current period. Access continues until{" "}
          {formatDate(renewalDate)}.
        </p>
      ) : null}

      {error ? (
        <p className="applyError" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="sponsorSectionLead">Loading billing…</p> : null}

      {stripeMemberReady && upgradeTiers.length > 0 ? (
        <div className="membershipBillingCenter__section">
          <h4>{tierKey === MEMBERSHIP_TIER_KEYS.NONE ? "Membership" : "Upgrade"}</h4>
          <p className="sponsorSectionLead">
            {tierKey === MEMBERSHIP_TIER_KEYS.NONE
              ? "Choose Support or Pro — both are billed annually."
              : "Upgrade your annual membership when you are ready."}
          </p>
          <div className="membershipBillingCenter__actions row wrap">
            {upgradeTiers.map(({ key, def, price, checkoutTier }) => (
              <button
                key={key}
                type="button"
                className={key === MEMBERSHIP_TIER_KEYS.MEMBER ? "btnPrimary" : "btnSoft"}
                disabled={!!busy}
                onClick={() => startCheckout(checkoutTier)}
              >
                {busy === checkoutTier ? "Redirecting…" : `${def.shortLabel}${price ? ` — ${price}` : ""}`}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showDowngradeHint ? (
        <div className="membershipBillingCenter__section">
          <h4>Downgrade or cancel</h4>
          <p className="sponsorSectionLead">{DOWNGRADE_HINT}</p>
          <ManageBillingButton stripeReady={stripeMemberReady} hasStripeCustomer={stripeCustomerReady} />
        </div>
      ) : null}

      <div className="membershipBillingCenter__section">
        <h4>Payment methods</h4>
        {!stripeMemberReady ? (
          <p className="sponsorSectionLead">Billing is not configured in this environment.</p>
        ) : (
          <>
            <button type="button" className="btnSoft" disabled={!!busy} onClick={addPaymentMethod}>
              {busy === "pm-add" ? "Opening…" : "Add card"}
            </button>
            {paymentMethods.length === 0 ? (
              <p className="sponsorSectionLead">No cards on file yet.</p>
            ) : (
              <ul className="membershipBillingCenter__pmList">
                {paymentMethods.map((pm) => {
                  const s = pm.summary;
                  const label = s ? `${String(s.brand || "card").toUpperCase()} •••• ${s.last4}` : pm.id;
                  return (
                    <li key={pm.id} className="membershipBillingCenter__pmItem">
                      <span>
                        {label}
                        {pm.isDefault ? " (default)" : ""}
                      </span>
                      <span className="row wrap">
                        {!pm.isDefault ? (
                          <button type="button" className="btnSoft" disabled={!!busy} onClick={() => setDefaultPm(pm.id)}>
                            Set default
                          </button>
                        ) : null}
                        <button type="button" className="btnSoft" disabled={!!busy} onClick={() => removePm(pm.id)}>
                          Remove
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="membershipBillingCenter__section">
        <h4>Billing history</h4>
        {invoices.length === 0 ? (
          <p className="sponsorSectionLead">No invoices yet.</p>
        ) : (
          <ul className="membershipBillingCenter__invoiceList">
            {invoices.map((inv) => (
              <li key={inv.id} className="membershipBillingCenter__invoiceItem">
                <span>
                  {inv.created ? formatDate(inv.created) : "—"} ·{" "}
                  {inv.amountPaid != null
                    ? new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: (inv.currency || "usd").toUpperCase(),
                      }).format((inv.amountPaid || 0) / 100)
                    : "—"}{" "}
                  · {String(inv.status || "").replace(/_/g, " ")}
                </span>
                {inv.hostedInvoiceUrl ? (
                  <a className="btnSoft" href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                    Receipt
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="membershipBillingCenter__footer">
        <ManageBillingButton stripeReady={stripeMemberReady} hasStripeCustomer={stripeCustomerReady} />
        <Link className="btnSoft" href="/settings#account-membership">
          Settings
        </Link>
      </div>
        </div>
      ) : null}
    </section>
  );
}
