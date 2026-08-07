"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FormCheckbox } from "@/components/forms/FormChoice";
import { BULK_PACKAGE_SIZES } from "@/lib/bulkLicensing/packageSizes";

/**
 * Two-step purchase: package cards → organization form → Stripe Checkout.
 */
export default function BulkLicensePurchaseForm() {
  const searchParams = useSearchParams();
  const initialPackage = Number(searchParams.get("package") || 0);
  const canceled = searchParams.get("checkout") === "canceled";

  const [step, setStep] = useState(
    BULK_PACKAGE_SIZES.includes(initialPackage) ? "form" : "packages",
  );
  const [packageSize, setPackageSize] = useState(
    BULK_PACKAGE_SIZES.includes(initialPackage) ? initialPackage : 50,
  );
  const [catalog, setCatalog] = useState(null);
  const [organizationName, setOrganizationName] = useState("");
  const [purchaserName, setPurchaserName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [organizationType, setOrganizationType] = useState("");
  const [businessCode, setBusinessCode] = useState("");
  const [purchaseOrderRef, setPurchaseOrderRef] = useState("");
  const [agreedAutoRenewal, setAgreedAutoRenewal] = useState(false);
  const [agreedLicenseTerms, setAgreedLicenseTerms] = useState(false);
  const [codeHint, setCodeHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bulk-licensing/packages", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!cancelled && data) setCatalog(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const packageMeta = useMemo(() => {
    const map = Object.fromEntries((catalog?.packages || []).map((p) => [p.size, p]));
    return map;
  }, [catalog]);

  const canSubmit = useMemo(() => {
    return (
      organizationName.trim().length >= 2 &&
      purchaserName.trim().length >= 2 &&
      workEmail.includes("@") &&
      businessCode.trim().length >= 2 &&
      agreedAutoRenewal &&
      agreedLicenseTerms &&
      !busy
    );
  }, [
    organizationName,
    purchaserName,
    workEmail,
    businessCode,
    agreedAutoRenewal,
    agreedLicenseTerms,
    busy,
  ]);

  function selectPackage(size) {
    setPackageSize(size);
    setStep("form");
    setError("");
  }

  async function checkCode() {
    setCodeHint("");
    const res = await fetch(
      `/api/bulk-licensing/business-code?code=${encodeURIComponent(businessCode)}`,
      { credentials: "include", cache: "no-store" },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCodeHint(data.message || "Could not check code.");
      return;
    }
    setCodeHint(data.message || (data.available ? "Available" : "Taken"));
    if (data.code) setBusinessCode(data.code);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/bulk-licensing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName,
          purchaserName,
          workEmail,
          billingEmail: billingEmail || workEmail,
          phone,
          website,
          organizationType,
          packageSize,
          businessCode,
          purchaseOrderRef,
          agreedAutoRenewal: true,
          agreedLicenseTerms: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        const returnTo = encodeURIComponent(`/bulk-licenses?package=${packageSize}`);
        window.location.href = `/login?returnTo=${returnTo}`;
        return;
      }
      if (!res.ok) {
        setError(data.message || data.error || "Checkout failed.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Checkout URL missing.");
    } catch {
      setError("Network error starting checkout.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "packages") {
    return (
      <div className="bulkLicensePurchase">
        {canceled ? (
          <p className="formError" role="status">
            Checkout was canceled. Choose a package to try again.
          </p>
        ) : null}
        {catalog && !catalog.checkoutConfigured ? (
          <p className="formError" role="status">
            Bulk checkout is not fully configured yet
            {catalog.missingEnvKeys?.length
              ? ` (missing ${catalog.missingEnvKeys.join(", ")})`
              : ""}
            .
          </p>
        ) : null}
        <div className="bulkLicensePurchase__cards">
          {BULK_PACKAGE_SIZES.map((size) => {
            const meta = packageMeta[size];
            return (
              <article key={size} className="bulkLicensePurchase__card">
                <h2>{size} Licenses</h2>
                <p>{size} individual annual memberships</p>
                {meta?.displayPrice ? (
                  <p className="bulkLicensePurchase__price">{meta.displayPrice}</p>
                ) : (
                  <p className="mutedText">Annual organization package</p>
                )}
                <button
                  type="button"
                  className="btnPrimary"
                  onClick={() => selectPackage(size)}
                  disabled={catalog && !meta?.priceIdConfigured}
                >
                  Purchase {size} Licenses
                </button>
              </article>
            );
          })}
        </div>
        <p className="mutedText bulkLicensePurchase__note">
          You must be signed in to complete purchase. Each seat is a unique license for one person —
          never a shared code.
        </p>
      </div>
    );
  }

  return (
    <form className="bulkLicensePurchase" onSubmit={onSubmit}>
      <div className="bulkLicensePurchase__selected">
        <p>
          Selected package: <strong>{packageSize} annual licenses</strong>
          {packageMeta[packageSize]?.displayPrice
            ? ` · ${packageMeta[packageSize].displayPrice}`
            : ""}
        </p>
        <button type="button" className="btnSoft" onClick={() => setStep("packages")}>
          Change package
        </button>
      </div>

      <label className="fieldLabel" htmlFor="orgName">
        Organization or business name
      </label>
      <input
        id="orgName"
        className="textInput"
        value={organizationName}
        onChange={(e) => setOrganizationName(e.target.value)}
        required
      />

      <label className="fieldLabel" htmlFor="purchaserName">
        Primary administrator name
      </label>
      <input
        id="purchaserName"
        className="textInput"
        value={purchaserName}
        onChange={(e) => setPurchaserName(e.target.value)}
        required
      />

      <label className="fieldLabel" htmlFor="workEmail">
        Work email
      </label>
      <input
        id="workEmail"
        type="email"
        className="textInput"
        value={workEmail}
        onChange={(e) => setWorkEmail(e.target.value)}
        required
      />

      <label className="fieldLabel" htmlFor="billingEmail">
        Billing contact email
      </label>
      <input
        id="billingEmail"
        type="email"
        className="textInput"
        value={billingEmail}
        onChange={(e) => setBillingEmail(e.target.value)}
        placeholder="Defaults to work email"
      />

      <label className="fieldLabel" htmlFor="phone">
        Phone (optional)
      </label>
      <input id="phone" className="textInput" value={phone} onChange={(e) => setPhone(e.target.value)} />

      <label className="fieldLabel" htmlFor="website">
        Website (optional)
      </label>
      <input
        id="website"
        className="textInput"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />

      <label className="fieldLabel" htmlFor="orgType">
        Industry or organization type (optional)
      </label>
      <input
        id="orgType"
        className="textInput"
        value={organizationType}
        onChange={(e) => setOrganizationType(e.target.value)}
      />

      <label className="fieldLabel" htmlFor="businessCode">
        Organization / business code
      </label>
      <div className="bulkLicensePurchase__codeRow">
        <input
          id="businessCode"
          className="textInput"
          value={businessCode}
          onChange={(e) => setBusinessCode(e.target.value.toUpperCase())}
          placeholder="ACME"
          required
        />
        <button type="button" className="btnSoft" onClick={checkCode}>
          Check availability
        </button>
      </div>
      {codeHint ? <p className="mutedText">{codeHint}</p> : null}
      <p className="mutedText">
        Codes become license prefixes like {businessCode || "ACME"}-001-•••••• through{" "}
        {businessCode || "ACME"}-{String(packageSize).padStart(3, "0")}-••••••
      </p>

      <label className="fieldLabel" htmlFor="poRef">
        Purchase order / reference (optional)
      </label>
      <input
        id="poRef"
        className="textInput"
        value={purchaseOrderRef}
        onChange={(e) => setPurchaseOrderRef(e.target.value)}
      />

      <FormCheckbox checked={agreedAutoRenewal} onChange={(e) => setAgreedAutoRenewal(e.target.checked)}>
        I agree this package renews automatically each year until canceled.
      </FormCheckbox>
      <FormCheckbox checked={agreedLicenseTerms} onChange={(e) => setAgreedLicenseTerms(e.target.checked)}>
        I agree to the bulk license terms. Each seat is for one individual account only.
      </FormCheckbox>

      {error ? <p className="formError">{error}</p> : null}

      <button type="submit" className="btnPrimary" disabled={!canSubmit}>
        {busy ? "Starting checkout…" : `Purchase ${packageSize} Licenses`}
      </button>
      <p className="mutedText">You will complete payment securely on Stripe.</p>
    </form>
  );
}
