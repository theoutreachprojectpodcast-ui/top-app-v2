import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient, profileTableName } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId, profileRowToClientDto } from "@/lib/profile/serverProfile";
import { normalizePublicAccountIntent } from "@/lib/account/accountModel";
import {
  buildProfileCompletenessDbPatch,
  normalizeContributionInterests,
} from "@/lib/profile/profileCompletenessModel";

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

const ONBOARDING_STEP_VALUES = new Set(["0", "1", "2", "3"]);

const CLIENT_ONBOARDING_STATUS = new Set(["in_progress"]);

const CONTACT_METHODS = new Set(["email", "phone", "sms", "in_app"]);

const IDENTITY_SEGMENTS = new Set([
  "veteran",
  "first_responder",
  "family_member",
  "supporter",
  "organization_representative",
  "sponsor",
  "resource_partner",
]);

const NOTIFICATION_CHANNELS = new Set(["email", "sms", "push", "in_app", "phone"]);

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
  if (typeof body.phoneNumber === "string") row.phone_number = body.phoneNumber.trim();
  if (typeof body.postalCode === "string") row.postal_code = body.postalCode.trim();
  if (typeof body.jobTitle === "string") row.job_title = body.jobTitle.trim();
  if (typeof body.reasonForJoining === "string") row.reason_for_joining = body.reasonForJoining.trim();
  if (typeof body.supportNeeds === "string") row.support_needs = body.supportNeeds.trim();
  if (typeof body.communities === "string") row.communities = body.communities.trim();
  if (typeof body.preferredContributionContact === "string") {
    row.preferred_contribution_contact = body.preferredContributionContact.trim();
  }

  if (typeof body.preferredContactMethod === "string") {
    const pcm = body.preferredContactMethod.trim().toLowerCase();
    if (CONTACT_METHODS.has(pcm)) row.preferred_contact_method = pcm;
  }

  if (typeof body.identitySegment === "string") {
    const seg = body.identitySegment.trim().toLowerCase();
    if (IDENTITY_SEGMENTS.has(seg)) row.identity_segment = seg;
    else if (seg === "") row.identity_segment = null;
  }

  if (Array.isArray(body.notificationPreferences)) {
    const cleaned = body.notificationPreferences
      .map((x) => String(x || "").trim().toLowerCase())
      .filter((x) => NOTIFICATION_CHANNELS.has(x));
    row.notification_preferences = cleaned;
  }

  if (body.contributionInterests && typeof body.contributionInterests === "object" && !Array.isArray(body.contributionInterests)) {
    row.contribution_interests = normalizeContributionInterests(body.contributionInterests);
  }

  if (typeof body.onboardingSkipped === "boolean") {
    row.onboarding_skipped = body.onboardingSkipped;
  }

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

  let next = await getProfileRowByWorkOSId(admin, user.id);
  const dto = profileRowToClientDto(next);
  const workOSUser = { email: user.email ?? "", firstName: user.firstName ?? "", lastName: user.lastName ?? "" };
  const { patch: cPatch, evaluation } = buildProfileCompletenessDbPatch(dto, { workOSUser }, next);

  const completenessRow = { ...cPatch };
  if (!evaluation.requiredAllMet) {
    completenessRow.onboarding_completed = false;
  }

  const { error: cErr } = await admin.from(profileTableName()).update(completenessRow).eq("workos_user_id", user.id);
  if (cErr) {
    return Response.json({ error: "completeness_sync_failed", message: cErr.message }, { status: 500 });
  }

  next = await getProfileRowByWorkOSId(admin, user.id);
  return Response.json({ profile: profileRowToClientDto(next) });
}
