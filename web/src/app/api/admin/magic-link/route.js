import { createSupabaseAdminClient, profileTableName } from "@/lib/supabase/admin";
import { isDefaultApprovedAdminEmail } from "@/lib/admin/adminPolicy";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { workosSignInLink } from "@/lib/auth/workosReturnTo";

export const runtime = "nodejs";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export async function POST(request) {
  if (!isWorkOSConfigured()) {
    return Response.json({ ok: false, error: "workos_not_configured" }, { status: 503 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const returnTo = String(body.returnTo || "/admin").trim().startsWith("/") ? String(body.returnTo || "/admin").trim() : "/admin";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const dbAdminGranted = async () => {
    if (!admin) return false;
    const { data } = await admin
      .from(profileTableName())
      .select("platform_role, admin_access_enabled")
      .eq("email", email)
      .maybeSingle();
    return !!(
      data &&
      String(data.platform_role || "").toLowerCase() === "admin" &&
      (data.admin_access_enabled == null || !!data.admin_access_enabled)
    );
  };

  const allowed = isDefaultApprovedAdminEmail(email) || (await dbAdminGranted());
  if (!allowed) {
    // Avoid leaking admin roster details.
    return Response.json({ ok: true, message: "If approved, a sign-in link is available for this account." });
  }

  const signInUrl = workosSignInLink(returnTo, { loginHint: email, rememberDevice: true });
  return Response.json({
    ok: true,
    email,
    signInUrl,
    message: "Admin Sign In link ready.",
  });
}

