import { withAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient, profileTableName } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId, profileRowToClientDto } from "@/lib/profile/serverProfile";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request) {
  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
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
  if (!file || typeof file === "string") {
    return Response.json({ error: "missing_file" }, { status: 400 });
  }

  const blob = /** @type {File} */ (file);
  if (blob.size > MAX_BYTES) {
    return Response.json({ error: "file_too_large" }, { status: 400 });
  }
  const type = blob.type || "application/octet-stream";
  if (!ALLOWED.has(type)) {
    return Response.json({ error: "unsupported_type" }, { status: 400 });
  }

  const ext = type === "image/jpeg" ? "jpg" : type.split("/")[1] || "bin";
  const path = `${auth.user.id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await blob.arrayBuffer());

  const { error: upErr } = await admin.storage.from("profile-photos").upload(path, buffer, {
    contentType: type,
    upsert: true,
  });
  if (upErr) {
    return Response.json({ error: "upload_failed", message: upErr.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("profile-photos").getPublicUrl(path);
  const url = pub?.publicUrl || "";

  const existing = await getProfileRowByWorkOSId(admin, auth.user.id);
  const photoPatch = { profile_photo_url: url, updated_at: new Date().toISOString() };
  if (!existing) {
    const { error: insErr } = await admin.from(profileTableName()).insert({
      workos_user_id: auth.user.id,
      email: auth.user.email || null,
      first_name: auth.user.firstName || "",
      last_name: auth.user.lastName || "",
      display_name:
        [auth.user.firstName, auth.user.lastName].filter(Boolean).join(" ").trim() || auth.user.email || "Member",
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
      .eq("workos_user_id", auth.user.id);
    if (dbErr) {
      return Response.json({ error: "profile_update_failed", message: dbErr.message }, { status: 500 });
    }
  }

  const next = await getProfileRowByWorkOSId(admin, auth.user.id);
  return Response.json({ profile: profileRowToClientDto(next), photoUrl: url });
}
