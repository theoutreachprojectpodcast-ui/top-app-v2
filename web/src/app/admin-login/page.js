"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resolvePostAuthReturnTarget } from "@/lib/auth/workosSafeReturn";

function AdminLoginForm() {
  const sp = useSearchParams();
  const returnTo = useMemo(() => {
    const raw = String(sp.get("returnTo") || "/admin").trim();
    return resolvePostAuthReturnTarget(raw, "/admin");
  }, [sp]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [adminEmailLogin, setAdminEmailLogin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/status", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAdminEmailLogin(!!data?.adminEmailLogin);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSendMagicLink(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/magic-link", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, returnTo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not start admin sign in.");
        return;
      }
      setMessage(data.message || "Sign-in ready.");
      const target = String(data.signInUrl || data.returnTo || returnTo).trim() || returnTo;
      window.location.assign(target);
    } catch {
      setError("Could not start admin sign in.");
    } finally {
      setBusy(false);
    }
  }

  const lead = adminEmailLogin
    ? "Enter your approved admin email. We verify the address and sign you in — no WorkOS."
    : "Use your approved admin email to continue. We send you to secure hosted sign-in.";

  return (
    <div className="shell">
      <section className="card">
        <p className="introTagline">Admin</p>
        <h2>Admin Sign In</h2>
        <p className="sponsorSectionLead">{lead}</p>
        <form className="form" onSubmit={onSendMagicLink}>
          <label className="fieldLabel" htmlFor="admin-login-email">
            Email
            <input
              id="admin-login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="andy@volentelabs.com"
              required
            />
          </label>
          <div className="row wrap">
            <button type="submit" className="btnPrimary" disabled={busy}>
              {adminEmailLogin ? "Continue" : "Send Magic Link"}
            </button>
            <Link className="btnSoft" href="/">
              Back to app
            </Link>
          </div>
        </form>
        {message ? <p className="applyStatus">{message}</p> : null}
        {error ? <p className="applyError">{error}</p> : null}
      </section>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="shell">
          <section className="card">
            <p className="sponsorSectionLead" style={{ margin: 0 }}>
              Loading sign-in…
            </p>
          </section>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
