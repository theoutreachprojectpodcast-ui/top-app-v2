"use client";

import { useState } from "react";
import { submitPodcastGuestApplication } from "@/features/podcasts/api/podcastApi";

const INITIAL = {
  full_name: "",
  email: "",
  organization: "",
  website_url: "",
  topic_pitch: "",
  why_now: "",
  social_links: "",
};

export default function PodcastApplyGuestForm({ supabase, onSubmitted }) {
  const [form, setForm] = useState(INITIAL);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    if (!form.full_name || !form.email || !form.topic_pitch) {
      setError("Please complete name, email, and topic pitch.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("");
    const result = await submitPodcastGuestApplication(supabase, form);
    if (!result.ok) setError(result.error || "Could not submit application.");
    else {
      setStatus(result.warning || "Application submitted. The podcast team will follow up.");
      setForm(INITIAL);
      if (typeof onSubmitted === "function") onSubmitted(result);
    }
    setBusy(false);
  }

  return (
    <section className="podcastApplySection" id="apply-guest">
      <h3>Apply to Be on the Podcast</h3>
      <form className="podcastApplyForm" onSubmit={onSubmit}>
        <input placeholder="Full name" value={form.full_name} onChange={(e) => setForm((d) => ({ ...d, full_name: e.target.value }))} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm((d) => ({ ...d, email: e.target.value }))} />
        <input placeholder="Organization (optional)" value={form.organization} onChange={(e) => setForm((d) => ({ ...d, organization: e.target.value }))} />
        <input placeholder="Website (optional)" value={form.website_url} onChange={(e) => setForm((d) => ({ ...d, website_url: e.target.value }))} />
        <textarea rows={3} placeholder="Topic pitch" value={form.topic_pitch} onChange={(e) => setForm((d) => ({ ...d, topic_pitch: e.target.value }))} />
        <textarea rows={2} placeholder="Why now?" value={form.why_now} onChange={(e) => setForm((d) => ({ ...d, why_now: e.target.value }))} />
        <textarea rows={2} placeholder="Social links" value={form.social_links} onChange={(e) => setForm((d) => ({ ...d, social_links: e.target.value }))} />
        <button className="btnPrimary" type="submit" disabled={busy}>{busy ? "Submitting..." : "Submit Guest Application"}</button>
      </form>
      {error ? <p className="applyError">{error}</p> : null}
      {status ? <p className="applyStatus">{status}</p> : null}
    </section>
  );
}
