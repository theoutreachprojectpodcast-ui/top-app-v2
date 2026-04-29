import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(_req, context) {
  const params = await context.params;
  const slug = String(params?.slug || "").trim();
  if (!slug) return Response.json({ guest: null }, { status: 400 });
  const admin = createSupabaseAdminClient();
  if (!admin) return Response.json({ guest: null, error: "server_unavailable" }, { status: 503 });

  if (slug.startsWith("ep-")) {
    const vid = slug.slice(3);
    const { data: row } = await admin.from("podcast_episode_featured_guest").select("*").eq("public_slug", slug).maybeSingle();
    if (row) {
      const verified = !!row.verified_for_public;
      const conf = Number(row.confidence_score);
      return Response.json({
        guest: {
          id: slug,
          slug,
          name: row.guest_name,
          title: [row.role_title, row.organization].filter(Boolean).join(" · ") || "Podcast guest",
          bio: row.short_bio,
          avatar_url: row.admin_profile_image_url || row.profile_image_url || "",
          website_url: "",
          upcoming: false,
          unverified: !verified && (!Number.isFinite(conf) || conf < 0.75),
          discussionSummary: String(row.discussion_summary || "").trim(),
        },
        episodeYoutubeId: vid,
      });
    }
  }

  const { data: g } = await admin.from("podcast_guests").select("*").eq("slug", slug).maybeSingle();
  if (g) return Response.json({ guest: g });
  return Response.json({ guest: null }, { status: 404 });
}
