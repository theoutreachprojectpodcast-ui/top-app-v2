import { createClient } from "@supabase/supabase-js";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { isCommunityModeratorServer } from "@/lib/community/moderatorServer";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import {
  batchEnrichOrgHeaderImages,
  enrichOrgHeaderImageForEin,
} from "@/server/orgHeaderImage/enrichOrgHeaderImage";

/** Node runtime: Buffer, Storage uploads, and long-running fetches (required on `pnpm dev` / localhost:3001). */
export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const READ_KEY = SERVICE_KEY || ANON_KEY;

function clean(value) {
  return String(value ?? "").trim();
}

function moderatorForbiddenResponse() {
  const hint =
    process.env.NODE_ENV === "development"
      ? "Add your WorkOS sign-in email to COMMUNITY_MODERATOR_EMAILS in .env.local (see .env.local.example)."
      : undefined;
  return Response.json(
    { error: "forbidden", message: "Moderator access required.", ...(hint ? { hint } : {}) },
    { status: 403 }
  );
}

function missingServiceRoleResponse() {
  return Response.json(
    {
      error: "missing_service_role",
      message:
        "Set SUPABASE_SERVICE_ROLE_KEY in .env.local. Org header enrichment updates the database and uploads to Storage; the anon key is not enough on localhost:3001 or in production.",
    },
    { status: 500 }
  );
}

function requireModerator(auth) {
  if (!auth.user) {
    return Response.json({ error: "unauthorized", message: "Sign in." }, { status: 401 });
  }
  if (!isCommunityModeratorServer({ email: auth.user.email, workosUserId: auth.user.id })) {
    return moderatorForbiddenResponse();
  }
  return null;
}

export async function GET(request) {
  if (!URL || !READ_KEY) return Response.json({ error: "Missing Supabase credentials." }, { status: 500 });
  const auth = await withAuth();
  const denied = requireModerator(auth);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const ein = normalizeEinDigits(searchParams.get("ein") || "");
  if (ein.length !== 9) {
    return Response.json({ error: "Provide ?ein= nine-digit EIN." }, { status: 400 });
  }

  const supabase = createClient(URL, READ_KEY);
  const { data: enrichment, error: e1 } = await supabase
    .from("nonprofit_directory_enrichment")
    .select("*")
    .eq("ein", ein)
    .maybeSingle();

  if (e1) return Response.json({ error: e1.message }, { status: 500 });

  const { data: org } = await supabase
    .from("nonprofits_search_app_v1")
    .select("ein,org_name,name,website,city,state")
    .or(`ein.eq.${ein},ein.eq.${ein.slice(0, 2)}-${ein.slice(2)}`)
    .maybeSingle();

  return Response.json({ ein, enrichment: enrichment || null, directory: org || null });
}

export async function POST(request) {
  if (!URL) return Response.json({ error: "Missing Supabase credentials." }, { status: 500 });
  if (!SERVICE_KEY) return missingServiceRoleResponse();
  const auth = await withAuth();
  const denied = requireModerator(auth);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const mode = clean(body.mode || "single").toLowerCase();
  const supabase = createClient(URL, SERVICE_KEY);

  if (mode === "batch") {
    const limit = Number(body.limit) || 10;
    const delayMs = Number(body.delayMs) || 400;
    const force = !!body.force;
    const out = await batchEnrichOrgHeaderImages(supabase, { limit, delayMs, force });
    if (!out.ok) return Response.json({ error: out.error }, { status: 500 });
    return Response.json({ ok: true, results: out.results });
  }

  const ein = normalizeEinDigits(body.ein || "");
  if (ein.length !== 9) return Response.json({ error: "Missing or invalid ein." }, { status: 400 });
  const force = !!body.force;

  const out = await enrichOrgHeaderImageForEin({
    supabase,
    ein,
    canonicalName: clean(body.canonical_name || body.canonicalName),
    recordWebsite: clean(body.website_url || body.websiteUrl),
    force,
  });

  if (!out.ok) return Response.json(out, { status: out.error === "no_enrichment_row" ? 404 : 400 });
  return Response.json({ ok: true, ...out });
}

export async function PATCH(request) {
  if (!URL) return Response.json({ error: "Missing Supabase credentials." }, { status: 500 });
  if (!SERVICE_KEY) return missingServiceRoleResponse();
  const auth = await withAuth();
  const denied = requireModerator(auth);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const ein = normalizeEinDigits(body.ein || "");
  const action = clean(body.action).toLowerCase();
  const notes = clean(body.notes);
  const manualUrl = clean(body.header_image_url || body.headerImageUrl);

  if (ein.length !== 9) return Response.json({ error: "Missing or invalid ein." }, { status: 400 });
  if (!["approve", "reject", "curate"].includes(action)) {
    return Response.json({ error: "action must be approve | reject | curate" }, { status: 400 });
  }

  const supabase = createClient(URL, SERVICE_KEY);
  const nowIso = new Date().toISOString();

  const { data: existing, error: loadErr } = await supabase
    .from("nonprofit_directory_enrichment")
    .select("ein,header_image_url")
    .eq("ein", ein)
    .maybeSingle();

  if (loadErr) return Response.json({ error: loadErr.message }, { status: 500 });
  if (!existing) return Response.json({ error: "no_enrichment_row" }, { status: 404 });

  /** @type {Record<string, unknown>} */
  const patch = {
    updated_at: nowIso,
    header_image_last_enriched_at: nowIso,
  };

  if (action === "approve") {
    patch.header_image_review_status = "approved";
    patch.header_image_status = "approved";
    if (notes) patch.header_image_notes = notes;
  } else if (action === "reject") {
    patch.header_image_review_status = "rejected";
    patch.header_image_status = "rejected";
    patch.header_image_url = null;
    patch.header_image_source_url = null;
    patch.header_image_source_type = null;
    patch.header_image_notes = notes || "Rejected by moderator; card falls back to category styling or legacy hero.";
  } else if (action === "curate") {
    if (!manualUrl) return Response.json({ error: "curate requires header_image_url" }, { status: 400 });
    patch.header_image_url = manualUrl;
    patch.header_image_source_url = manualUrl;
    patch.header_image_source_type = "manual_curated";
    patch.header_image_status = "curated";
    patch.header_image_review_status = "curated";
    patch.header_image_notes = notes || "Manually curated image URL.";
    patch.hero_image_url = manualUrl;
  }

  const { error: upErr } = await supabase.from("nonprofit_directory_enrichment").update(patch).eq("ein", ein);
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  return Response.json({ ok: true, ein, action });
}
