import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";

export const runtime = "nodejs";

const KEYS = new Set([
  "name",
  "display_name",
  "internal_alias",
  "primary_display_tag",
  "sponsor_type",
  "sponsor_display_group",
  "sponsor_category",
  "cta_label",
  "cta_url",
  "promo_code",
  "inquiry_url",
  "publish_status",
  "published_at",
  "featured_items",
  "website_url",
  "social_links",
  "logo_url",
  "background_image_url",
  "short_description",
  "long_description",
  "tagline",
  "instagram_url",
  "facebook_url",
  "linkedin_url",
  "twitter_url",
  "youtube_url",
  "featured",
  "display_order",
  "verified",
  "sponsor_scope",
  "sponsor_status",
  "mission_partner",
  "veteran_owned",
  "podcast_sponsor",
  "supporting_sponsor",
  "is_active",
  "payment_status",
  "onboarding_status",
  "admin_notes",
]);

export async function PATCH(request, context) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-app-api-admin-sponsors-[slug]-patch" });
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const slug = String(params?.slug || "").trim();
  if (!slug) {
    return Response.json({ ok: false, error: "missing_slug" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const patch = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(body || {})) {
    if (!KEYS.has(k)) continue;
    if (
      k === "featured" ||
      k === "verified" ||
      k === "mission_partner" ||
      k === "veteran_owned" ||
      k === "podcast_sponsor" ||
      k === "supporting_sponsor" ||
      k === "is_active"
    ) {
      patch[k] = Boolean(v);
    } else if (k === "display_order") {
      const n = parseInt(String(v), 10);
      if (Number.isFinite(n)) patch[k] = n;
    } else if (k === "publish_status") {
      const s = String(v || "").trim().toLowerCase();
      if (s === "draft" || s === "published" || s === "archived") {
        patch[k] = s;
        if (s === "published" && !Object.prototype.hasOwnProperty.call(body || {}, "published_at")) {
          patch.published_at = new Date().toISOString();
        }
      }
    } else if (k === "published_at") {
      patch[k] = v ? String(v).trim() : null;
    } else if (k === "featured_items") {
      if (Array.isArray(v)) {
        patch[k] = v;
      } else if (typeof v === "string") {
        const raw = v.trim();
        if (!raw) patch[k] = [];
        else {
          try {
            const parsed = JSON.parse(raw);
            patch[k] = Array.isArray(parsed) ? parsed : [];
          } catch {
            return Response.json({ ok: false, error: "invalid_featured_items_json" }, { status: 400 });
          }
        }
      }
    } else if (k === "social_links") {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        patch[k] = v;
      } else if (typeof v === "string") {
        const raw = v.trim();
        if (!raw) patch[k] = null;
        else {
          try {
            const parsed = JSON.parse(raw);
            patch[k] = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
          } catch {
            return Response.json({ ok: false, error: "invalid_social_links_json" }, { status: 400 });
          }
        }
      }
    } else if (typeof v === "string") {
      patch[k] = v.trim() || null;
    } else if (v === null) {
      patch[k] = null;
    }
  }

  if (Object.keys(patch).length <= 1) {
    return Response.json({ ok: false, error: "no_valid_fields" }, { status: 400 });
  }

  const { data, error } = await ctx.admin
    .from("sponsors_catalog")
    .update(patch)
    .eq("slug", slug)
    .select("*")
    .maybeSingle();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const copyKeys = ["tagline", "short_description", "long_description"];
  if (copyKeys.some((k) => Object.prototype.hasOwnProperty.call(body || {}, k))) {
    const enrichPatch = {
      sponsor_id: data.id,
      canonical_display_name: String(data.display_name || data.name || "").trim() || data.name,
      curated_tagline: data.tagline,
      curated_short_description: data.short_description,
      curated_long_description: data.long_description,
      curated_at: new Date().toISOString(),
      curated_source: "admin",
      enrichment_status: "curated",
      updated_at: new Date().toISOString(),
    };
    const { error: enrichErr } = await ctx.admin.from("sponsor_enrichment").upsert(enrichPatch, {
      onConflict: "sponsor_id",
    });
    if (enrichErr && !/curated_/i.test(enrichErr.message || "")) {
      console.warn("[admin/sponsors] sponsor_enrichment upsert:", enrichErr.message);
    }
  }

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.sponsors.slug.PATCH",
    resourceType: "admin_mutation",
    resourceId: null,
    metadata: { route: "sponsors/[slug]" },
  });
  return Response.json({ ok: true, row: data });
}
