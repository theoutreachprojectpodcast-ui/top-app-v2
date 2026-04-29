import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient, profileTableName } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId, profileRowToClientDto } from "@/lib/profile/serverProfile";
import { normalizePublicAccountIntent } from "@/lib/account/accountModel";

const META_KEYS = new Set([
  "identityRole",
  "missionStatement",
  "organizationAffiliation",
  "serviceBackground",
  "city",
  "state",
  "causes",
  "skills",
  "volunteerInterests",
  "supportInterests",
  "contributionSummary",
  "sponsorOrgName",
  "sponsorWebsite",
  "sponsorIntentSummary",
  "sponsorApplicationNotes",
  "sponsorOnboardingPath",
  "sponsorApplicationStatus",
  "onboardingCurrentStep",
  "colorScheme",
]);

const ONBOARDING_STEP_VALUES = new Set(["0", "1", "2"]);

const CLIENT_ONBOARDING_STATUS = new Set(["in_progress"]);

export async function PATCH(request) {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const existing = await getProfileRowByWorkOSId(admin, user.id);
  const prevMeta =
    existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? { ...existing.metadata }
      : {};

  for (const k of META_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(body, k)) continue;
    if (k === "onboardingCurrentStep") {
      const s = String(body[k] ?? "").trim();
      if (ONBOARDING_STEP_VALUES.has(s)) prevMeta[k] = s;
      continue;
    }
    prevMeta[k] = String(body[k] ?? "").trim();
  }

  const row = {
    updated_at: new Date().toISOString(),
    metadata: prevMeta,
  };

  if (typeof body.firstName === "string") row.first_name = body.firstName.trim();
  if (typeof body.lastName === "string") row.last_name = body.lastName.trim();
  if (typeof body.displayName === "string") row.display_name = body.displayName.trim();
  if (typeof body.email === "string") row.email = body.email.trim();
  if (typeof body.bio === "string") row.bio = body.bio.trim();
  if (typeof body.banner === "string") row.banner = body.banner.trim();
  if (typeof body.theme === "string") row.theme = body.theme.trim();
  if (typeof body.avatarUrl === "string") row.profile_photo_url = body.avatarUrl.trim();
  /* membership_tier / membership_status: Stripe webhooks + /api/me/onboarding/complete only — not profile PATCH. */

  if (typeof body.accountIntent === "string") {
    const intent = normalizePublicAccountIntent(body.accountIntent);
    if (intent) row.account_intent = intent;
  }
  if (typeof body.onboardingStatus === "string") {
    const os = body.onboardingStatus.trim().toLowerCase();
    if (CLIENT_ONBOARDING_STATUS.has(os)) row.onboarding_status = os;
  }

  if (!existing) {
    const insertRow = {
      workos_user_id: user.id,
      email: user.email || row.email || null,
      first_name: row.first_name ?? user.firstName ?? "",
      last_name: row.last_name ?? user.lastName ?? "",
      display_name:
        row.display_name ??
        ([user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          user.email ||
          "Member"),
      membership_tier: row.membership_tier ?? "free",
      membership_status: row.membership_status ?? "none",
      onboarding_completed: false,
      ...row,
    };
    const { error: insErr } = await admin.from(profileTableName()).insert(insertRow);
    if (insErr) {
      return Response.json({ error: "insert_failed", message: insErr.message }, { status: 500 });
    }
  } else {
    const { error } = await admin.from(profileTableName()).update(row).eq("workos_user_id", user.id);
    if (error) {
      return Response.json({ error: "update_failed", message: error.message }, { status: 500 });
    }
  }

  const next = await getProfileRowByWorkOSId(admin, user.id);
  return Response.json({ profile: profileRowToClientDto(next) });
}
