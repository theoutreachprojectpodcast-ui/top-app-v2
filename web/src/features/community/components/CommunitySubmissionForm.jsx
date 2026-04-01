"use client";

import { useState } from "react";
import { FormCheckbox } from "@/components/forms/FormChoice";
import { STORY_CATEGORIES } from "@/features/community/data/communitySeed";
import { submitCommunityStory } from "@/features/community/api/communityApi";

const INITIAL = {
  title: "",
  body: "",
  nonprofit_name: "",
  category: "success_story",
  show_author_name: true,
  link_url: "",
};

export default function CommunitySubmissionForm({
  supabase,
  userId,
  authorName,
  authorAvatarUrl,
  onClose,
  onSubmitted,
}) {
  const [form, setForm] = useState(INITIAL);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    if (!String(form.body || "").trim()) {
      setError("Please share your story in the text area.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const result = await submitCommunityStory(supabase, {
        author_id: userId,
        author_name: authorName || "Community member",
        author_avatar_url: authorAvatarUrl || "",
        title: form.title.trim(),
        body: form.body.trim(),
        nonprofit_name: form.nonprofit_name.trim(),
        category: form.category,
        show_author_name: form.show_author_name,
        link_url: form.link_url.trim(),
      });
      if (result.warning) setStatus(result.warning);
      else setStatus("Thank you. Your story is submitted for review before it can appear in the community feed.");
      setForm(INITIAL);
      onSubmitted?.();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="communitySubmitModal">
      <p className="communitySubmitLead">
        Stories are read by our team first. Only approved, mission-aligned posts are published—keeping this space safe and useful.
      </p>
      <form className="communitySubmitForm" onSubmit={onSubmit}>
        <input
          placeholder="Title (optional)"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <textarea
          rows={5}
          required
          placeholder="Your experience, in your own words…"
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
        />
        <input
          placeholder="Nonprofit or resource referenced (optional)"
          value={form.nonprofit_name}
          onChange={(e) => setForm((f) => ({ ...f, nonprofit_name: e.target.value }))}
        />
        <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
          {STORY_CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          placeholder="Link (optional — for future use)"
          value={form.link_url}
          onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
        />
        <FormCheckbox
          checked={form.show_author_name}
          onChange={(e) => setForm((f) => ({ ...f, show_author_name: e.target.checked }))}
        >
          Show my name if this story is published
        </FormCheckbox>
        {error ? <p className="applyError">{error}</p> : null}
        {status ? <p className="applyStatus">{status}</p> : null}
        <div className="row wrap">
          <button type="button" className="btnSoft" onClick={onClose}>Close</button>
          <button type="submit" className="btnPrimary" disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</button>
        </div>
      </form>
    </div>
  );
}

