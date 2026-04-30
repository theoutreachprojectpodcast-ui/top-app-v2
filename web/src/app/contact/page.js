"use client";

import { useEffect, useState } from "react";

const DEFAULT_SUCCESS = "Thanks for reaching out. We will get back to you shortly.";

export default function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(DEFAULT_SUCCESS);

  useEffect(() => {
    let mounted = true;
    fetch("/api/contact", { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => {
        if (!mounted) return;
        const next = String(body?.settings?.successMessage || DEFAULT_SUCCESS).trim();
        setSuccessMessage(next || DEFAULT_SUCCESS);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, subject, message }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not send contact request.");
        return;
      }
      setStatus(successMessage);
      setFullName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
    } catch {
      setError("Could not send contact request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sponsorPage sponsorLanding">
      <section className="panel" style={{ maxWidth: 760 }}>
        <h1>Contact</h1>
        <p>Send a message to The Outreach Project team. Submissions are saved in the admin portal for follow-up.</p>
        {status ? <p style={{ color: "var(--color-success, #166534)" }}>{status}</p> : null}
        {error ? <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>{error}</p> : null}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="fieldLabel" htmlFor="contact-name">Name</label>
            <input id="contact-name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="fieldLabel" htmlFor="contact-email">Email</label>
            <input id="contact-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="fieldLabel" htmlFor="contact-phone">Phone (optional)</label>
            <input id="contact-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="fieldLabel" htmlFor="contact-subject">Subject</label>
            <input id="contact-subject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="fieldLabel" htmlFor="contact-message">Message</label>
            <textarea id="contact-message" className="input" value={message} onChange={(e) => setMessage(e.target.value)} required />
          </div>
          <button type="submit" className="btnPrimary" disabled={loading}>{loading ? "Sending…" : "Send message"}</button>
        </form>
      </section>
    </div>
  );
}
