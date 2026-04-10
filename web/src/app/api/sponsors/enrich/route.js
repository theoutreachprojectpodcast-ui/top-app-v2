import { createClient } from "@supabase/supabase-js";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { isCommunityModeratorServer } from "@/lib/community/moderatorServer";

export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = "sponsors_catalog";

function clean(value) {
  return String(value ?? "").trim();
}

function isLikelySocial(url, hostNeedle) {
  const raw = clean(url);
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.hostname.toLowerCase().includes(hostNeedle);
  } catch {
    return false;
  }
}

function extractMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return clean(m[1]);
  }
  return "";
}

function extractAnchorLinks(html) {
  const links = [];
  const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = regex.exec(html))) links.push(clean(m[1]));
  return links;
}

async function loadWebsiteSignals(websiteUrl) {
  const url = clean(websiteUrl);
  if (!url) return {};
  try {
    const response = await fetch(url, { redirect: "follow", headers: { "user-agent": "TOP-Sponsor-Enrichment/1.0" } });
    if (!response.ok) return {};
    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = clean(titleMatch?.[1]);
    const description = extractMeta(html, "description") || extractMeta(html, "og:description");
    const logo = extractMeta(html, "og:image");
    const links = extractAnchorLinks(html);
    return {
      title,
      description,
      logo,
      instagram_url: links.find((l) => isLikelySocial(l, "instagram.com")) || "",
      facebook_url: links.find((l) => isLikelySocial(l, "facebook.com")) || "",
      linkedin_url: links.find((l) => isLikelySocial(l, "linkedin.com")) || "",
      twitter_url: links.find((l) => isLikelySocial(l, "x.com") || isLikelySocial(l, "twitter.com")) || "",
      youtube_url: links.find((l) => isLikelySocial(l, "youtube.com") || isLikelySocial(l, "youtu.be")) || "",
    };
  } catch {
    return {};
  }
}

export async function POST(request) {
  if (!URL) return Response.json({ error: "Missing Supabase credentials." }, { status: 500 });
  if (!SERVICE_KEY) {
    return Response.json(
      {
        error: "missing_service_role",
        message:
          "Set SUPABASE_SERVICE_ROLE_KEY in .env.local so sponsor meta enrichment can write sponsors_catalog and sponsor_enrichment on localhost:3000.",
      },
      { status: 500 }
    );
  }

  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ error: "unauthorized", message: "Sign in to run sponsor enrichment." }, { status: 401 });
  }
  if (!isCommunityModeratorServer({ email: auth.user.email, workosUserId: auth.user.id })) {
    const hint =
      process.env.NODE_ENV === "development"
        ? "Add your WorkOS sign-in email to COMMUNITY_MODERATOR_EMAILS in .env.local."
        : undefined;
    return Response.json(
      { error: "forbidden", message: "Moderator access required.", ...(hint ? { hint } : {}) },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const slug = clean(body.slug);
  if (!slug) return Response.json({ error: "Missing sponsor slug." }, { status: 400 });
  const supabase = createClient(URL, SERVICE_KEY);
  const { data: row, error } = await supabase.from(TABLE).select("*").eq("slug", slug).maybeSingle();
  if (error || !row) return Response.json({ error: "Sponsor not found." }, { status: 404 });

  const signals = await loadWebsiteSignals(row.website_url);
  const nowIso = new Date().toISOString();
  const hasSignals = !!(clean(signals.title) || clean(signals.description) || clean(signals.logo));

  const enrichmentRow = {
    sponsor_id: row.id,
    canonical_display_name: clean(row.name) || clean(signals.title) || clean(row.slug),
    extracted_site_title: clean(signals.title) || null,
    extracted_meta_description: clean(signals.description) || null,
    enrichment_confidence: hasSignals ? 0.72 : 0.15,
    enrichment_status: hasSignals ? "enriched" : "pending",
    source_summary: hasSignals ? "website_html_meta" : "no_signals",
    review_required: !hasSignals,
    last_enriched_at: nowIso,
    updated_at: nowIso,
  };

  const { error: enrichErr } = await supabase.from("sponsor_enrichment").upsert(enrichmentRow, { onConflict: "sponsor_id" });
  if (enrichErr) {
    console.warn("[torp] sponsor_enrichment upsert", enrichErr.message);
  }

  const patch = {
    name: clean(row.name) || clean(signals.title) || clean(row.slug),
    short_description: clean(row.short_description) || clean(signals.description),
    long_description: clean(row.long_description) || clean(signals.description),
    tagline: clean(row.tagline) || clean(signals.title) || clean(signals.description),
    logo_url: clean(row.logo_url) || clean(signals.logo),
    background_image_url: clean(row.background_image_url) || clean(signals.logo),
    instagram_url: clean(row.instagram_url) || clean(signals.instagram_url),
    facebook_url: clean(row.facebook_url) || clean(signals.facebook_url),
    linkedin_url: clean(row.linkedin_url) || clean(signals.linkedin_url),
    twitter_url: clean(row.twitter_url) || clean(signals.twitter_url),
    youtube_url: clean(row.youtube_url) || clean(signals.youtube_url),
    enrichment_status: hasSignals ? "enriched" : clean(row.enrichment_status) || "manual",
    verified: hasSignals ? true : !!row.verified,
    last_enriched_at: nowIso,
  };
  const { data: updated, error: upErr } = await supabase.from(TABLE).update(patch).eq("slug", slug).select("*").maybeSingle();
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  return Response.json({ ok: true, row: updated });
}
