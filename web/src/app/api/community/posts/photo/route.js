import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { profileMayCreateCommunityPost } from "@/lib/account/entitlements";
import { safeUploadObjectPath, validateImageUpload } from "@/lib/security/uploadPolicy";

const BUCKET = "profile-photos";

export async function POST(request) {
  const guard = guardMutation(request, { rateKey: "community-post-photo", limit: 30 });
  if (!guard.ok) return guardFailureResponse(guard);

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, message: "Community storage is not available." }, { status: 503 });
  }

  const profileRow = await getProfileRowByWorkOSId(admin, user.id);
  if (!profileRow?.id) {
    return Response.json(
      { ok: false, message: "Finish onboarding so we can attach your story to your profile." },
      { status: 403 },
    );
  }

  if (!profileMayCreateCommunityPost(profileRow)) {
    return Response.json(
      {
        ok: false,
        message: "Only moderators can upload images for new community posts in V1.",
      },
      { status: 403 },
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, message: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  const validated = await validateImageUpload(file);
  if (!validated.ok) {
    const message =
      validated.error === "file_too_large"
        ? "Image must be 5 MB or smaller."
        : validated.error === "unsupported_type"
          ? "Use a JPEG, PNG, WebP, or GIF image."
          : "Could not use that image. Try another file.";
    return Response.json({ ok: false, message }, { status: validated.status });
  }

  const path = safeUploadObjectPath(`community-${user.id}`, validated.ext);
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, validated.buffer, {
    contentType: validated.mime,
    upsert: false,
  });
  if (upErr) {
    return Response.json({ ok: false, message: "Upload failed. Please try again." }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const photoUrl = pub?.publicUrl || "";
  if (!photoUrl) {
    return Response.json({ ok: false, message: "Upload failed. Please try again." }, { status: 500 });
  }

  return Response.json({ ok: true, photoUrl });
}
