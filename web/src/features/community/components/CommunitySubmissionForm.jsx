"use client";

import { useState } from "react";
import { FormCheckbox } from "@/components/forms/FormChoice";
import { STORY_CATEGORIES, SUBMISSION_TYPES } from "@/features/community/data/communitySeed";
import { submitCommunityStory } from "@/features/community/api/communityApi";

const INITIAL = {
  title: "",
  body: "",
  nonprofit_name: "",
  post_type: "share_story",
  category: "success_story",
  show_author_name: true,
  link_url: "",
  photo_url: "",
};

export default function CommunitySubmissionForm({
  supabase,
  userId,
  authorName,
  authorAvatarUrl,
  onClose,
  onSubmitted,
  useWorkOSApi = false,
}) {
  const [form, setForm] = useState(INITIAL);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function onPhotoSelected(file) {
    if (!file || !String(file.type || "").startsWith("image/")) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setForm((f) => ({ ...f, photo_url: dataUrl }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    const story = String(form.body || "").trim();
    if (!story) {
      setError("Please share your story in the text area.");
      return;
    }
    if (useWorkOSApi && story.length < 20) {
      setError("Please add a bit more detail — at least 20 characters.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const result = await submitCommunityStory(
        supabase,
        {
          author_id: userId,
          author_name: authorName || "Community member",
          author_avatar_url: authorAvatarUrl || "",
          title: form.title.trim(),
          body: form.body.trim(),
          nonprofit_name: form.nonprofit_name.trim(),
          post_type: form.post_type,
          category: form.category,
          show_author_name: form.show_author_name,
          link_url: form.link_url.trim(),
          photo_url: form.photo_url || "",
        },
        { useWorkOSApi },
      );
      if (!result.ok) {
        setError(result.message || "Could not submit.");
        return;
      }
      if (result.warning) setStatus(result.warning);
      else if (result.message) setStatus(result.message);
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
      <form className="communitySubmitForm communitySubmitForm--ds" onSubmit={onSubmit}>
        <label className="fieldLabel">Title <span className="fieldOptional">(optional)</span></label>
        <input
          placeholder="Give your story a short headline"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <label className="fieldLabel">Submission type</label>
        <select value={form.post_type} onChange={(e) => setForm((f) => ({ ...f, post_type: e.target.value }))}>
          {SUBMISSION_TYPES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <label className="fieldLabel">Your story</label>
        <textarea
          rows={5}
          required
          placeholder="Your experience, in your own words…"
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
        />
        <label className="fieldLabel">Nonprofit or resource <span className="fieldOptional">(optional)</span></label>
        <input
          placeholder="Organization you want to mention"
          value={form.nonprofit_name}
          onChange={(e) => setForm((f) => ({ ...f, nonprofit_name: e.target.value }))}
        />
        <label className="fieldLabel">Story category</label>
        <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
          {STORY_CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <label className="fieldLabel">Related link <span className="fieldOptional">(optional)</span></label>
        <input
          placeholder="https://…"
          value={form.link_url}
          onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
        />
        <label className="profilePhotoUploadLabel communityStoryPhotoLabel">
          <span className="profilePhotoUploadTitle">Cover image</span>
          <span className="profilePhotoUploadHint">
            Optional photo with your story. Inline preview today; secure bucket upload will use the story media schema when enabled.
          </span>
          <input type="file" accept="image/*" onChange={(e) => onPhotoSelected(e.target.files?.[0])} />
        </label>
        {form.photo_url ? (
          <div className="communityUploadPreview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.photo_url} alt="Selected upload preview" />
          </div>
        ) : null}
        <div className="dsChoiceGroup">
          <FormCheckbox
            checked={form.show_author_name}
            onChange={(e) => setForm((f) => ({ ...f, show_author_name: e.target.checked }))}
          >
            Show my name if this story is published
          </FormCheckbox>
        </div>
        {error ? <p className="applyError">{error}</p> : null}
        {status ? <p className="applyStatus">{status}</p> : null}
        <div className="row wrap communitySubmitActions">
          <button type="button" className="btnSoft" onClick={onClose}>Close</button>
          <button type="submit" className="btnPrimary" disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</button>
        </div>
      </form>
    </div>
  );
}
