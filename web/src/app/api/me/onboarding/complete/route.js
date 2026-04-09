import { withAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient, profileTableName } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId, profileRowToClientDto } from "@/lib/profile/serverProfile";

const TIERS = new Set(["free", "support", "member", "sponsor"]);

export async function POST(request) {
  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* optional body */
  }

  const tier = typeof body.membershipTier === "string" ? body.membershipTier.toLowerCase() : "free";
  const safeTier = TIERS.has(tier) ? tier : "free";

  const billingStatus =
    safeTier === "free" ? "none" : typeof body.membershipStatus === "string" ? body.membershipStatus : "pending";

  const row = {
    onboarding_completed: true,
    membership_tier: safeTier,
    membership_status: billingStatus,
    updated_at: new Date().toISOString(),
  };

  const existing = await getProfileRowByWorkOSId(admin, auth.user.id);
  if (!existing) {
    const insertRow = {
      workos_user_id: auth.user.id,
      email: auth.user.email || null,
      first_name: auth.user.firstName || "",
      last_name: auth.user.lastName || "",
      display_name:
        [auth.user.firstName, auth.user.lastName].filter(Boolean).join(" ").trim() || auth.user.email || "Member",
      profile_photo_url: null,
      bio: "",
      banner: "",
      theme: "clean",
      metadata: {},
      ...row,
    };
    const { error: insErr } = await admin.from(profileTableName()).insert(insertRow);
    if (insErr) {
      return Response.json({ error: "insert_failed", message: insErr.message }, { status: 500 });
    }
  } else {
    const { error } = await admin.from(profileTableName()).update(row).eq("workos_user_id", auth.user.id);
    if (error) {
      return Response.json({ error: "update_failed", message: error.message }, { status: 500 });
    }
  }

  const next = await getProfileRowByWorkOSId(admin, auth.user.id);
  return Response.json({ profile: profileRowToClientDto(next) });
}
