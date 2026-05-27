import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient, profileTableName } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId, profileRowToClientDto } from "@/lib/profile/serverProfile";
import { safeUploadObjectPath, validateImageUpload } from "@/lib/security/uploadPolicy";

export async function POST(request) {
  const guard = guardMutation(request, { rateKey: "me-avatar", limit: 20 });
  if (!guard.ok) return guardFailureResponse(guard);

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "invalid_form" }, { status: 400 });
  }
  const file = form.get("file");
  const validated = await validateImageUpload(file);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: validated.status });
  }

  const path = safeUploadObjectPath(user.id, validated.ext);
  const { error: upErr } = await admin.storage.from("profile-photos").upload(path, validated.buffer, {
    contentType: validated.mime,
    upsert: true,
  });
  if (upErr) {
    return Response.json({ error: "upload_failed", message: upErr.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("profile-photos").getPublicUrl(path);
  const url = pub?.publicUrl || "";

  const existing = await getProfileRowByWorkOSId(admin, user.id);
  const photoPatch = { profile_photo_url: url, updated_at: new Date().toISOString() };
  if (!existing) {
    const { error: insErr } = await admin.from(profileTableName()).insert({
      workos_user_id: user.id,
      email: user.email || null,
      first_name: user.firstName || "",
      last_name: user.lastName || "",
      display_name:
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email || "Member",
      membership_tier: "free",
      membership_status: "none",
      onboarding_completed: false,
      metadata: {},
      ...photoPatch,
    });
    if (insErr) {
      return Response.json({ error: "profile_insert_failed", message: insErr.message }, { status: 500 });
    }
  } else {
    const { error: dbErr } = await admin
      .from(profileTableName())
      .update(photoPatch)
      .eq("workos_user_id", user.id);
    if (dbErr) {
      return Response.json({ error: "profile_update_failed", message: dbErr.message }, { status: 500 });
    }
  }

  const next = await getProfileRowByWorkOSId(admin, user.id);
  return Response.json({ profile: profileRowToClientDto(next), photoUrl: url });
}
