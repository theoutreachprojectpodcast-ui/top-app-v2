import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { profileTableName } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(_request, context) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const workosUserId = String(params?.workosUserId || "").trim();
  if (!workosUserId) {
    return Response.json({ ok: false, error: "missing_workos_user_id" }, { status: 400 });
  }

  const table = profileTableName();
  const { data: profile, error: profileErr } = await ctx.admin
    .from(table)
    .select("*")
    .eq("workos_user_id", workosUserId)
    .maybeSingle();

  if (profileErr) return Response.json({ ok: false, error: profileErr.message }, { status: 500 });
  if (!profile) return Response.json({ ok: false, error: "profile_not_found" }, { status: 404 });

  const email = String(profile.email || "").trim().toLowerCase();

  const [postsRes, podcastRes, sponsorRes] = await Promise.all([
    ctx.admin
      .from("community_posts")
      .select("id, title, status, created_at, post_type")
      .or(`author_id.eq.${workosUserId},author_profile_id.eq.${profile.id}`)
      .order("created_at", { ascending: false })
      .limit(30),
    email
      ? ctx.admin
          .from("podcast_guest_applications")
          .select("id, full_name, status, created_at, topic_pitch")
          .ilike("email", email)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    email
      ? ctx.admin
          .from("sponsor_applications")
          .select("id, organization_name, status, created_at")
          .ilike("contact_email", email)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  return Response.json({
    ok: true,
    profile,
    communityPosts: postsRes.data || [],
    podcastApplications: podcastRes.data || [],
    sponsorApplications: sponsorRes.data || [],
    billingNote:
      "Payment method and card data are not exposed. Use Stripe Dashboard for PCI-scoped payment details.",
  });
}
