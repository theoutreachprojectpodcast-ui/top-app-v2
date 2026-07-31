"use client";

import { useEffect, useId, useState } from "react";
import { FormCheckbox } from "@/components/forms/FormChoice";
import { STORY_CATEGORIES, SUBMISSION_TYPES } from "@/features/community/data/communitySeed";
import { submitCommunityStory, updateAuthorCommunityPost } from "@/features/community/api/communityApi";
import { sanitizeCommunityStoryPhotoUrl } from "@/features/community/domain/communityStoryPhoto";

const INITIAL = {
  title: "",
  body: "",
  nonprofit_name: "",
  nonprofit_ein: "",
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
  /** When set, form PATCHes this post (`mapCommunityPostRow` shape) instead of creating. */
  editPost = null,
  scrollRef = null,
}) {
  const formId = useId();
  const [form, setForm] = useState(INITIAL);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const isEdit = Boolean(editPost?.id);

  async function readImageDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadStoryPhoto(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/community/posts/photo", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.photoUrl) {
      throw new Error(json.message || "Could not upload that image.");
    }
    return String(json.photoUrl);
  }

  useEffect(() => {
    if (!editPost?.id) {
      setForm(INITIAL);
      return;
    }
    setForm({
      title: editPost.title || "",
      body: editPost.body || "",
      nonprofit_name: editPost.nonprofitName || "",
      nonprofit_ein: editPost.nonprofitEin ? String(editPost.nonprofitEin) : "",
      post_type: editPost.postType || "share_story",
      category: editPost.category || "success_story",
      show_author_name: editPost.showAuthorName !== false,
      link_url: editPost.linkUrl || "",
      photo_url: editPost.photoUrl || "",
    });
  }, [editPost]);

  async function onPhotoSelected(file) {
    if (!file || !String(file.type || "").startsWith("image/")) return;
    setPhotoBusy(true);
    setError("");
    try {
      if (useWorkOSApi) {
        const photoUrl = await uploadStoryPhoto(file);
        setForm((f) => ({ ...f, photo_url: photoUrl }));
        return;
      }
      const dataUrl = await readImageDataUrl(file);
      setForm((f) => ({ ...f, photo_url: dataUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that image.");
    } finally {
      setPhotoBusy(false);
    }
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
    const photoUrl = sanitizeCommunityStoryPhotoUrl(form.photo_url);
    try {
      if (isEdit && useWorkOSApi) {
        const result = await updateAuthorCommunityPost(editPost.id, {
          title: form.title.trim(),
          body: form.body.trim(),
          nonprofit_name: form.nonprofit_name.trim(),
          nonprofit_ein: form.nonprofit_ein.trim(),
          post_type: form.post_type,
          category: form.category,
          show_author_name: form.show_author_name,
          link_url: form.link_url.trim(),
          photo_url: photoUrl,
        });
        if (!result.ok) {
          setError(result.message || "Could not save.");
          return;
        }
        setStatus(result.message || "Changes saved.");
        onSubmitted?.();
        onClose?.();
        return;
      }
      const result = await submitCommunityStory(
        supabase,
        {
          author_id: userId,
          author_name: authorName || "Community member",
          author_avatar_url: authorAvatarUrl || "",
          title: form.title.trim(),
          body: form.body.trim(),
          nonprofit_name: form.nonprofit_name.trim(),
          nonprofit_ein: form.nonprofit_ein.trim(),
          post_type: form.post_type,
          category: form.category,
          show_author_name: form.show_author_name,
          link_url: form.link_url.trim(),
          photo_url: photoUrl,
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
      <div className="communitySubmitModalScroll" ref={scrollRef}>
        <p className="communitySubmitLead">
          {isEdit
            ? "Update your post below. Changes save to your story right away unless pre-approval moderation is turned on."
            : "Share a story, photo, or link with the community. Posts publish immediately unless an admin has enabled pre-approval review."}
        </p>
        <form id={formId} className="communitySubmitForm communitySubmitForm--ds" onSubmit={onSubmit}>
          <label className="fieldLabel">
            Title <span className="fieldOptional">(optional)</span>
            <input
              className="communitySubmitInput"
              placeholder="Give your story a short headline"
              value={form.title}
              autoComplete="off"
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <label className="fieldLabel">
            Submission type
            <select
              className="communitySubmitInput"
              value={form.post_type}
              onChange={(e) => setForm((f) => ({ ...f, post_type: e.target.value }))}
            >
              {SUBMISSION_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="fieldLabel">
            Your story
            <textarea
              className="communitySubmitInput communitySubmitInput--body"
              rows={5}
              required
              placeholder="Your experience, in your own words…"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </label>
          <label className="fieldLabel">
            Nonprofit or resource <span className="fieldOptional">(optional)</span>
            <input
              className="communitySubmitInput"
              placeholder="Organization you want to mention"
              value={form.nonprofit_name}
              autoComplete="organization"
              onChange={(e) => setForm((f) => ({ ...f, nonprofit_name: e.target.value }))}
            />
          </label>
          <label className="fieldLabel">
            Story category
            <select
              className="communitySubmitInput"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {STORY_CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="fieldLabel">
            Related link <span className="fieldOptional">(optional)</span>
            <input
              className="communitySubmitInput"
              placeholder="https://…"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              value={form.link_url}
              onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
            />
          </label>
          <div className="communityStoryPhotoField">
            <span className="fieldLabel">
              Cover image <span className="fieldOptional">(optional)</span>
            </span>
            <p className="communityStoryPhotoHint">JPEG, PNG, WebP, or GIF — up to 5 MB.</p>
            <label className="btnSoft communityStoryPhotoTrigger">
              {photoBusy ? "Uploading…" : "Choose image"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="communityStoryPhotoInput"
                disabled={photoBusy || busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  void onPhotoSelected(file);
                }}
              />
            </label>
          </div>
          {form.photo_url ? (
            <div className="communityUploadPreview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.photo_url} alt="Selected upload preview" />
              <button
                type="button"
                className="btnSoft communityStoryPhotoRemove"
                disabled={photoBusy || busy}
                onClick={() => setForm((f) => ({ ...f, photo_url: "" }))}
              >
                Remove image
              </button>
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
        </form>
      </div>
      <div className="communitySubmitModalFoot">
        <button type="button" className="btnSoft" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="submit" form={formId} className="btnPrimary" disabled={busy || photoBusy}>
          {busy ? (isEdit ? "Saving…" : "Publishing…") : isEdit ? "Save changes" : "Publish post"}
        </button>
      </div>
    </div>
  );
}
