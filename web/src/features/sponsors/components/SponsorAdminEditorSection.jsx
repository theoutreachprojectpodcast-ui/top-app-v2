"use client";

import { useEffect, useMemo, useState } from "react";
import { getSponsorAdminViewModel } from "@/features/sponsors/domain/sponsorViewModels";
import { runSponsorEnrichment, saveSponsorAdminRecord } from "@/features/sponsors/api/sponsorCatalogApi";

const NEW_SPONSOR_DRAFT = {
  name: "",
  slug: "",
  logo_url: "",
  background_image_url: "",
  sponsor_type: "",
  short_description: "",
  long_description: "",
  tagline: "",
  website_url: "",
  instagram_url: "",
  facebook_url: "",
  linkedin_url: "",
  twitter_url: "",
  youtube_url: "",
  additional_links_json: "[]",
  featured: false,
  display_order: 0,
};

export default function SponsorAdminEditorSection({ showAdmin = false, supabase, sponsors = [], onSaved }) {
  const [step, setStep] = useState("select");
  const [selectedSlug, setSelectedSlug] = useState("");
  const [draft, setDraft] = useState(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const options = useMemo(() => sponsors.map((row) => getSponsorAdminViewModel(row)), [sponsors]);

  useEffect(() => {
    if (!options.length) return;
    if (selectedSlug === "__new__") return;
    const current = options.find((item) => item.slug === selectedSlug) || options[0];
    setSelectedSlug(current.slug);
    setDraft(current);
  }, [options, selectedSlug]);

  const filteredOptions = options.filter((item) => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return true;
    return String(item.name || "").toLowerCase().includes(q) || String(item.sponsor_type || "").toLowerCase().includes(q);
  });

  async function onSave() {
    if (!draft) return;
    setBusy(true);
    setStatus("");
    setError("");
    let additionalLinks = [];
    try {
      additionalLinks = JSON.parse(String(draft.additional_links_json || "[]"));
    } catch {
      setBusy(false);
      setError("Additional links must be valid JSON.");
      return;
    }

    const payload = {
      ...draft,
      additional_links: Array.isArray(additionalLinks) ? additionalLinks : [],
    };
    const result = await saveSponsorAdminRecord(supabase, payload);
    if (!result.ok) setError(result.error || "Could not save sponsor.");
    else {
      setStatus("Sponsor record saved.");
      onSaved?.();
    }
    setBusy(false);
  }

  async function onEnrich() {
    if (!draft?.slug) return;
    setBusy(true);
    setStatus("");
    setError("");
    const result = await runSponsorEnrichment(draft.slug);
    if (!result.ok) setError(result.error || "Enrichment failed.");
    else {
      setStatus("Enrichment complete. Review and save changes.");
      if (result.row) setDraft(getSponsorAdminViewModel(result.row));
      onSaved?.();
    }
    setBusy(false);
  }

  if (!showAdmin) return null;
  if (!draft) return null;

  return (
    <section className="card sponsorAdminSection" aria-labelledby="sponsor-admin-editor-title">
      <div className="sponsorAdminSectionHead">
        <div>
          <h3 id="sponsor-admin-editor-title">Sponsor Admin Editor (inline)</h3>
          <p className="sponsorSectionLead">Edit every sponsor field here. This module is isolated for future admin-interface extraction.</p>
        </div>
        <span className="sponsorAdminBadge">Admin editor</span>
      </div>
      {step === "select" ? (
        <>
          <div className="sponsorAdminEditorToolbar">
            <input
              placeholder="Search sponsor by name or type"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className="btnSoft"
              type="button"
              onClick={() => {
                setSelectedSlug("__new__");
                setDraft({ ...NEW_SPONSOR_DRAFT });
                setStep("edit");
              }}
            >
              New Sponsor
            </button>
          </div>
          <div className="sponsorAdminSelectorGrid">
            {filteredOptions.map((item) => (
              <button
                key={item.slug}
                type="button"
                className={`sponsorAdminSelectCard ${selectedSlug === item.slug ? "isActive" : ""}`}
                onClick={() => {
                  setSelectedSlug(item.slug);
                  setDraft(item);
                  setStep("edit");
                }}
              >
                <strong>{item.name}</strong>
                <span>{item.sponsor_type || "Partner"}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="sponsorAdminEditorToolbar">
            <button className="btnSoft" type="button" onClick={() => setStep("select")}>Back to sponsor selection</button>
            <button className="btnSoft" type="button" onClick={onEnrich} disabled={busy}>Run Enrichment</button>
          </div>
          <p className="sponsorAdminMeta">
            Editing: <strong>{draft.name || "New sponsor"}</strong> ({draft.slug || "new"})
          </p>
          <details className="sponsorDetailCard" open>
            <summary>Basic Info</summary>
            <div className="sponsorAdminEditorGrid">
              {["name", "slug", "sponsor_type", "featured", "display_order"].map((field) => (
                <label key={field} className="sponsorAdminField">
                  <span>{field}</span>
                  {field === "featured" ? (
                    <input type="checkbox" checked={!!draft.featured} onChange={(e) => setDraft((prev) => ({ ...prev, featured: e.target.checked }))} />
                  ) : (
                    <input value={String(draft[field] ?? "")} onChange={(e) => setDraft((prev) => ({ ...prev, [field]: e.target.value }))} />
                  )}
                </label>
              ))}
            </div>
          </details>
          <details className="sponsorDetailCard" open>
            <summary>Branding / Logo / Background</summary>
            <div className="sponsorAdminEditorGrid">
              {["logo_url", "background_image_url", "tagline", "short_description", "long_description"].map((field) => (
                <label key={field} className="sponsorAdminField">
                  <span>{field}</span>
                  {field === "long_description" ? (
                    <textarea rows={4} value={String(draft[field] ?? "")} onChange={(e) => setDraft((prev) => ({ ...prev, [field]: e.target.value }))} />
                  ) : (
                    <input value={String(draft[field] ?? "")} onChange={(e) => setDraft((prev) => ({ ...prev, [field]: e.target.value }))} />
                  )}
                </label>
              ))}
            </div>
          </details>
          <details className="sponsorDetailCard" open>
            <summary>Website / Social / Additional Links</summary>
            <div className="sponsorAdminEditorGrid">
              {["website_url", "instagram_url", "facebook_url", "linkedin_url", "twitter_url", "youtube_url", "additional_links_json"].map((field) => (
                <label key={field} className="sponsorAdminField">
                  <span>{field}</span>
                  {field === "additional_links_json" ? (
                    <textarea rows={5} value={String(draft[field] ?? "")} onChange={(e) => setDraft((prev) => ({ ...prev, [field]: e.target.value }))} />
                  ) : (
                    <input value={String(draft[field] ?? "")} onChange={(e) => setDraft((prev) => ({ ...prev, [field]: e.target.value }))} />
                  )}
                </label>
              ))}
            </div>
          </details>
          <div className="row wrap">
            <button className="btnPrimary" type="button" onClick={onSave} disabled={busy}>Save Sponsor</button>
          </div>
        </>
      )}
      {status ? <p className="applyStatus">{status}</p> : null}
      {error ? <p className="applyError">{error}</p> : null}
    </section>
  );
}
