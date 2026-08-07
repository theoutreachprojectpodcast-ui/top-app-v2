"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LicenseRedeemForm({ initialCode = "", inviteToken = "" }) {
  const router = useRouter();
  const [licenseCode, setLicenseCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/bulk-licensing/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          inviteToken
            ? { inviteToken }
            : { licenseCode },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || "Redemption failed.");
        return;
      }
      setResult(data);
      if (data.organizationId) {
        setTimeout(() => router.push("/profile"), 1500);
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="licenseRedeemForm" onSubmit={onSubmit}>
      {!inviteToken ? (
        <>
          <label className="fieldLabel" htmlFor="licenseCode">
            License code
          </label>
          <input
            id="licenseCode"
            className="textInput"
            value={licenseCode}
            onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
            placeholder="ACME-001-K7Q9M2"
            required
          />
        </>
      ) : (
        <p>Sign in with the invited email, then activate your organization seat.</p>
      )}
      {error ? <p className="formError">{error}</p> : null}
      {result?.ok ? (
        <p>
          Activated for <strong>{result.organizationName}</strong>
          {result.expiresAt
            ? ` through ${new Date(result.expiresAt).toLocaleDateString()}`
            : ""}
          .
          {(result.warnings || []).map((w) => (
            <span key={w.code} className="mutedText">
              {" "}
              {w.message}
            </span>
          ))}
        </p>
      ) : null}
      <button type="submit" className="btnPrimary" disabled={busy}>
        {busy ? "Activating…" : "Activate membership"}
      </button>
    </form>
  );
}
