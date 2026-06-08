"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminRichTextEditor from "@/components/admin/AdminRichTextEditor";
import AdminMediaUploadField from "@/components/admin/AdminMediaUploadField";
import { routeForContentBlock } from "@/lib/admin/pageContentBlocks";
import { htmlToPlainText } from "@/lib/admin/sanitizeHtml";

const PAGES = [
  { id: "homepage", label: "Homepage" },
  { id: "sponsors", label: "Sponsors" },
  { id: "community", label: "Community" },
  { id: "podcast", label: "Podcast" },
  { id: "trusted", label: "Trusted resources" },
  { id: "nonprofit", label: "Nonprofit directory" },
  { id: "membership", label: "Membership" },
  { id: "about", label: "About" },
  { id: "other", label: "Other / page images" },
];

const CONTENT_TYPES = [
  { id: "card", label: "Card" },
  { id: "carousel", label: "Carousel item" },
  { id: "sponsor", label: "Sponsor" },
  { id: "community_post", label: "Community post" },
  { id: "blog", label: "Blog / update" },
  { id: "resource", label: "Resource" },
  { id: "podcast_app", label: "Podcast application / update" },
  { id: "image_block", label: "Image block" },
  { id: "video_block", label: "Video block" },
  { id: "cta", label: "CTA block" },
  { id: "featured", label: "Featured section" },
  { id: "testimonial", label: "Testimonial" },
  { id: "link", label: "Link / resource item" },
];

const STEPS = ["Page", "Type", "Details", "Media"];

export default function AdminContentCreateWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [page, setPage] = useState("");
  const [contentType, setContentType] = useState("");
  const [details, setDetails] = useState({
    title: "",
    subtitle: "",
    body: "",
    category: "",
    tags: "",
    ctaLabel: "",
    ctaLink: "",
    status: "draft",
    displayOrder: "0",
    publishDate: "",
    featured: false,
  });
  const [media, setMedia] = useState({
    logoUrl: "",
    headerImageUrl: "",
    thumbnailUrl: "",
    videoUrl: "",
    podcastEmbed: "",
  });
  const [message, setMessage] = useState("");
  const [blockId, setBlockId] = useState("");
  const [saving, setSaving] = useState(false);

  const stepLabels = useMemo(() => STEPS, []);

  function validateStep(idx) {
    if (idx === 0 && !page) return "Choose which page this content is for.";
    if (idx === 1 && !contentType) return "Choose a content type.";
    if (idx === 2) {
      if (!String(details.title || "").trim() && !htmlToPlainText(details.body).trim()) {
        return "Add a title or description.";
      }
    }
    return "";
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setMessage(err);
      return;
    }
    setMessage("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setMessage("");
    setStep((s) => Math.max(s - 1, 0));
  }

  function buildBlockPayload(status = "draft") {
    return {
      page_key: page,
      block_type: contentType,
      content_type: contentType,
      title: details.title,
      subtitle: details.subtitle,
      body_html: details.body,
      body: details.body,
      category: details.category,
      tags: details.tags,
      cta_label: details.ctaLabel,
      cta_link: details.ctaLink,
      display_order: details.displayOrder,
      publish_date: details.publishDate,
      featured: details.featured,
      status,
      logo_url: media.logoUrl,
      header_image_url: media.headerImageUrl,
      thumbnail_url: media.thumbnailUrl,
      video_url: media.videoUrl,
      podcast_embed: media.podcastEmbed,
    };
  }

  async function saveDraft() {
    const err = validateStep(2);
    if (err) {
      setMessage(err);
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const url = blockId ? `/api/admin/page-content-blocks/${blockId}` : "/api/admin/page-content-blocks";
      const res = await fetch(url, {
        method: blockId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBlockPayload("draft")),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Could not save draft to page_content_blocks.");
        return;
      }
      if (data.row?.id) setBlockId(data.row.id);
      setDetails((d) => ({ ...d, status: "draft" }));
      setMessage("Draft saved to page_content_blocks. Use Publish to open the section admin.");
    } catch {
      setMessage("Could not save draft.");
    } finally {
      setSaving(false);
    }
  }

  function preview() {
    const target = routeForContentBlock(page, contentType);
    const q = new URLSearchParams({
      preview: "1",
      page,
      type: contentType,
      title: details.title,
    });
    window.open(`${target}?${q.toString()}`, "_blank", "noopener");
  }

  async function publish() {
    const err = validateStep(2);
    if (err) {
      setMessage(err);
      return;
    }
    await saveDraft();
    const target = routeForContentBlock(page, contentType);
    const q = new URLSearchParams({
      wizard: "1",
      page,
      type: contentType,
      title: details.title,
      featured: details.featured ? "1" : "0",
    });
    if (blockId) q.set("block_id", blockId);
    setMessage(`Opening ${target} to complete publishing…`);
    router.push(`${target}?${q.toString()}`);
  }

  return (
    <div className="adminPanel">
      <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 700 }}>
        Create content
      </h1>
      <p className="adminMuted" style={{ lineHeight: 1.55 }}>
        Step-by-step assistant for adding site content. Required fields are marked. Use{" "}
        <strong>Publish</strong> to open the right admin panel with your choices pre-filled.
      </p>

      <ol className="adminWizardSteps" aria-label="Creation steps">
        {stepLabels.map((label, i) => (
          <li key={label} className={i === step ? "isCurrent" : i < step ? "isDone" : ""}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {message ? (
        <p role="status" className="adminMuted" style={{ marginTop: 12 }}>
          {message}
        </p>
      ) : null}

      {step === 0 ? (
        <div className="adminFieldStack">
          <p className="fieldLabel">What page is this content for?</p>
          {PAGES.map((p) => (
            <label key={p.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="radio" name="wizard-page" checked={page === p.id} onChange={() => setPage(p.id)} />
              {p.label}
            </label>
          ))}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="adminFieldStack">
          <p className="fieldLabel">What type of content?</p>
          {CONTENT_TYPES.map((t) => (
            <label key={t.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="radio"
                name="wizard-type"
                checked={contentType === t.id}
                onChange={() => setContentType(t.id)}
              />
              {t.label}
            </label>
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="adminFieldStack">
          <label className="fieldLabel" htmlFor="w-title">
            Title <span aria-hidden="true">*</span>
          </label>
          <input
            id="w-title"
            className="adminConsoleInput"
            value={details.title}
            onChange={(e) => setDetails((d) => ({ ...d, title: e.target.value }))}
          />
          <label className="fieldLabel" htmlFor="w-sub">
            Subtitle
          </label>
          <input
            id="w-sub"
            className="adminConsoleInput"
            value={details.subtitle}
            onChange={(e) => setDetails((d) => ({ ...d, subtitle: e.target.value }))}
          />
          <label className="fieldLabel" htmlFor="w-body">
            Description / body
          </label>
          <AdminRichTextEditor
            value={details.body}
            onChange={(html) => setDetails((d) => ({ ...d, body: html }))}
            placeholder="Write copy with formatting and emoji…"
          />
          <label className="fieldLabel" htmlFor="w-cat">
            Category
          </label>
          <input
            id="w-cat"
            className="adminConsoleInput"
            value={details.category}
            onChange={(e) => setDetails((d) => ({ ...d, category: e.target.value }))}
          />
          <label className="fieldLabel" htmlFor="w-tags">
            Tags (comma-separated)
          </label>
          <input
            id="w-tags"
            className="adminConsoleInput"
            value={details.tags}
            onChange={(e) => setDetails((d) => ({ ...d, tags: e.target.value }))}
          />
          <label className="fieldLabel" htmlFor="w-cta-l">
            CTA label
          </label>
          <input
            id="w-cta-l"
            className="adminConsoleInput"
            value={details.ctaLabel}
            onChange={(e) => setDetails((d) => ({ ...d, ctaLabel: e.target.value }))}
          />
          <label className="fieldLabel" htmlFor="w-cta-u">
            CTA link
          </label>
          <input
            id="w-cta-u"
            className="adminConsoleInput"
            value={details.ctaLink}
            onChange={(e) => setDetails((d) => ({ ...d, ctaLink: e.target.value }))}
          />
          <label className="fieldLabel" htmlFor="w-order">
            Display order
          </label>
          <input
            id="w-order"
            className="adminConsoleInput"
            type="number"
            value={details.displayOrder}
            onChange={(e) => setDetails((d) => ({ ...d, displayOrder: e.target.value }))}
          />
          <label className="fieldLabel" htmlFor="w-status">
            Status
          </label>
          <select
            id="w-status"
            className="adminConsoleInput"
            value={details.status}
            onChange={(e) => setDetails((d) => ({ ...d, status: e.target.value }))}
          >
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="in_review">In review</option>
            <option value="approved">Approved</option>
          </select>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={details.featured}
              onChange={(e) => setDetails((d) => ({ ...d, featured: e.target.checked }))}
            />
            Featured
          </label>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="adminFieldStack">
          <p className="adminMuted">Upload or paste URLs. Copies from the media library work in any field below.</p>
          <AdminMediaUploadField
            label="Upload asset"
            onUploaded={(url) => setMedia((m) => ({ ...m, headerImageUrl: m.headerImageUrl || url }))}
          />
          <label className="fieldLabel" htmlFor="w-logo">
            Logo URL
          </label>
          <input
            id="w-logo"
            className="adminConsoleInput"
            value={media.logoUrl}
            onChange={(e) => setMedia((m) => ({ ...m, logoUrl: e.target.value }))}
          />
          <label className="fieldLabel" htmlFor="w-header">
            Header / hero image
          </label>
          <input
            id="w-header"
            className="adminConsoleInput"
            value={media.headerImageUrl}
            onChange={(e) => setMedia((m) => ({ ...m, headerImageUrl: e.target.value }))}
          />
          <label className="fieldLabel" htmlFor="w-thumb">
            Thumbnail
          </label>
          <input
            id="w-thumb"
            className="adminConsoleInput"
            value={media.thumbnailUrl}
            onChange={(e) => setMedia((m) => ({ ...m, thumbnailUrl: e.target.value }))}
          />
          <label className="fieldLabel" htmlFor="w-video">
            Video / embed URL
          </label>
          <input
            id="w-video"
            className="adminConsoleInput"
            value={media.videoUrl}
            onChange={(e) => setMedia((m) => ({ ...m, videoUrl: e.target.value }))}
          />
          <p className="adminMuted">
            <Link href="/admin/media-library">Open media library</Link> to reuse uploads.
          </p>
        </div>
      ) : null}

      <div className="adminWizardActions">
        {step > 0 ? (
          <button type="button" className="btnSoft" onClick={goBack}>
            Back
          </button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <button type="button" className="btnPrimary" onClick={goNext}>
            Next
          </button>
        ) : null}
        <button type="button" className="btnSoft" disabled={saving} onClick={() => void saveDraft()}>
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button type="button" className="btnSoft" onClick={preview}>
          Preview
        </button>
        {step === STEPS.length - 1 ? (
          <button type="button" className="btnPrimary" onClick={() => void publish()}>
            Publish
          </button>
        ) : null}
        <Link className="btnSoft" href="/admin/content">
          Cancel
        </Link>
      </div>
    </div>
  );
}
