import { createClient } from "@supabase/supabase-js";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { isCommunityModeratorServer } from "@/lib/community/moderatorServer";
import {
  batchEnrichSponsorLogos,
  enrichSponsorLogoForSlug,
} from "@/server/sponsorLogo/enrichSponsorLogo";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TABLE = "sponsors_catalog";

function clean(value) {
  return String(value ?? "").trim();
}

function requireModerator(auth) {
  if (!auth.user) {
    return Response.json({ error: "unauthorized", message: "Sign in." }, { status: 401 });
  }
  if (!isCommunityModeratorServer({ email: auth.user.email, workosUserId: auth.user.id })) {
    return Response.json({ error: "forbidden", message: "Moderator access required." }, { status: 403 });
  }
  return null;
}

export async function GET(request) {
  if (!URL || !KEY) return Response.json({ error: "Missing Supabase credentials." }, { status: 500 });
  const auth = await withAuth();
  const denied = requireModerator(auth);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const slug = clean(searchParams.get("slug"));
  if (!slug) return Response.json({ error: "Provide ?slug=" }, { status: 400 });

  const supabase = createClient(URL, KEY);
  const { data: row, error } = await supabase.from(TABLE).select("*").eq("slug", slug).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!row) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ slug, sponsor: row });
}

export async function POST(request) {
  if (!URL || !KEY) return Response.json({ error: "Missing Supabase credentials." }, { status: 500 });
  const auth = await withAuth();
  const denied = requireModerator(auth);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const mode = clean(body.mode || "single").toLowerCase();
  const supabase = createClient(URL, KEY);

  if (mode === "batch") {
    const limit = Number(body.limit) || 8;
    const delayMs = Number(body.delayMs) || 450;
    const force = !!body.force;
    const out = await batchEnrichSponsorLogos(supabase, { limit, delayMs, force });
    if (!out.ok) return Response.json({ error: out.error }, { status: 500 });
    return Response.json({ ok: true, results: out.results });
  }

  const slug = clean(body.slug);
  if (!slug) return Response.json({ error: "Missing slug." }, { status: 400 });
  const force = !!body.force;

  const out = await enrichSponsorLogoForSlug(supabase, slug, { force });
  if (!out.ok) {
    const status = out.error === "not_found" ? 404 : out.error === "locked_curated_or_approved" ? 409 : 400;
    return Response.json(out, { status });
  }

  const { data: row } = await supabase.from(TABLE).select("*").eq("slug", slug).maybeSingle();
  return Response.json({ ok: true, ...out, row: row || null });
}

export async function PATCH(request) {
  if (!URL || !KEY) return Response.json({ error: "Missing Supabase credentials." }, { status: 500 });
  const auth = await withAuth();
  const denied = requireModerator(auth);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const slug = clean(body.slug);
  const action = clean(body.action).toLowerCase();
  const notes = clean(body.notes);
  const manualUrl = clean(body.logo_url || body.logoUrl);

  if (!slug) return Response.json({ error: "Missing slug." }, { status: 400 });
  if (!["approve", "reject", "curate"].includes(action)) {
    return Response.json({ error: "action must be approve | reject | curate" }, { status: 400 });
  }

  const supabase = createClient(URL, KEY);
  const nowIso = new Date().toISOString();

  const { data: existing, error: loadErr } = await supabase.from(TABLE).select("slug,logo_url").eq("slug", slug).maybeSingle();
  if (loadErr) return Response.json({ error: loadErr.message }, { status: 500 });
  if (!existing) return Response.json({ error: "not_found" }, { status: 404 });

  /** @type {Record<string, unknown>} */
  const patch = { updated_at: nowIso, logo_last_enriched_at: nowIso };

  if (action === "approve") {
    patch.logo_review_status = "approved";
    patch.logo_status = "approved";
    if (notes) patch.logo_notes = notes;
  } else if (action === "reject") {
    patch.logo_review_status = "rejected";
    patch.logo_status = "rejected";
    patch.logo_url = null;
    patch.logo_source_url = null;
    patch.logo_source_type = null;
    patch.logo_notes = notes || "Rejected by moderator.";
  } else if (action === "curate") {
    if (!manualUrl) return Response.json({ error: "curate requires logo_url" }, { status: 400 });
    patch.logo_url = manualUrl;
    patch.logo_source_url = manualUrl;
    patch.logo_source_type = "manual_curated";
    patch.logo_status = "curated";
    patch.logo_review_status = "curated";
    patch.logo_notes = notes || "Manually curated logo URL.";
  }

  const { error: upErr } = await supabase.from(TABLE).update(patch).eq("slug", slug);
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  return Response.json({ ok: true, slug, action });
}
