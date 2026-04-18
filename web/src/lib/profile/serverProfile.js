import { profileTableName } from "@/lib/supabase/admin";

const TABLE = () => profileTableName();

/** @param {import('@supabase/supabase-js').SupabaseClient} admin */
export async function getProfileRowByWorkOSId(admin, workosUserId) {
  if (!admin || !workosUserId) return null;
  const { data, error } = await admin.from(TABLE()).select("*").eq("workos_user_id", workosUserId).maybeSingle();
  if (error || !data) return null;
  return data;
}

/** @param {import('@supabase/supabase-js').SupabaseClient} admin */
export async function getProfileRowByStripeCustomerId(admin, stripeCustomerId) {
  if (!admin || !stripeCustomerId) return null;
  const { data, error } = await admin.from(TABLE()).select("*").eq("stripe_customer_id", stripeCustomerId).maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * Profile safe for browser — no internal ids.
 * @param {Record<string, unknown>} row
 */
export function profileRowToClientDto(row) {
  if (!row) return null;
  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    profileRecordId: row.id ?? null,
    email: row.email ?? "",
    displayName: row.display_name ?? "",
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    bio: row.bio ?? "",
    avatarUrl: row.profile_photo_url ?? "",
    membershipTier: row.membership_tier ?? "free",
    membershipBillingStatus: row.membership_status ?? "none",
    onboardingCompleted: !!row.onboarding_completed,
    platformRole: String(row.platform_role || "user").trim() || "user",
    accountIntent: row.account_intent != null ? String(row.account_intent).trim() : "",
    onboardingStatus: String(row.onboarding_status || "not_started").trim() || "not_started",
    banner: row.banner ?? "",
    theme: row.theme ?? "clean",
    stripeCustomerIdSet: Boolean(row.stripe_customer_id),
    stripeSubscriptionIdSet: Boolean(row.stripe_subscription_id),
    membershipSource: String(row.membership_source || "manual").trim() || "manual",
    ...spreadMetadata(meta),
  };
}

function spreadMetadata(meta) {
  const keys = [
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
    "podcastSponsorLastTierId",
    "podcastSponsorLastCheckoutAt",
    "podcastSponsorLastSessionId",
  ];
  const out = {};
  for (const k of keys) {
    out[k] = String(meta[k] ?? "").trim();
  }
  return out;
}

/** @param {import('@workos-inc/node').User} user */
export function workOSUserToUpsertPayload(user) {
  const first = user.firstName || "";
  const last = user.lastName || "";
  const display = [first, last].filter(Boolean).join(" ").trim() || user.email || "Member";
  const emailTrim = String(user.email || "").trim();
  const out = {
    workos_user_id: user.id,
    ...(emailTrim ? { email: emailTrim } : {}),
    first_name: first,
    last_name: last,
    display_name: display,
    updated_at: new Date().toISOString(),
  };
  const pic = String(user.profilePictureUrl || "").trim();
  if (pic) out.profile_photo_url = pic;
  return out;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('@workos-inc/node').User} user
 */
export async function upsertProfileFromWorkOSUser(admin, user) {
  if (!admin) return { ok: false, reason: "no_admin" };
  const existing = await getProfileRowByWorkOSId(admin, user.id);
  const payload = workOSUserToUpsertPayload(user);
  const { error } = await admin.from(TABLE()).upsert(payload, { onConflict: "workos_user_id" });
  if (error) return { ok: false, reason: error.message };
  return { ok: true, isNew: !existing };
}

/**
 * Persist WorkOS session (login) email to `torp_profiles.email` when missing or changed.
 * Creates the profile row via the same upsert as `/callback` when none exists.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('@workos-inc/node').User} user — `auth.user` from `withAuth()`
 */
export async function syncProfileEmailWithWorkOSUser(admin, user) {
  if (!admin || !user?.id) return { ok: false, reason: "invalid" };
  const sessionEmail = String(user.email || "").trim();
  if (!sessionEmail) return { ok: true, reason: "no_session_email" };

  const existing = await getProfileRowByWorkOSId(admin, user.id);
  if (!existing) {
    return upsertProfileFromWorkOSUser(admin, user);
  }

  const dbEmail = String(existing.email || "").trim();
  /* Only copy sign-in email into the row when empty — do not overwrite a profile email the user set in Settings. */
  if (!dbEmail) {
    return patchProfileByWorkOSId(admin, user.id, { email: sessionEmail });
  }
  if (dbEmail.toLowerCase() === sessionEmail.toLowerCase()) {
    return { ok: true, reason: "unchanged" };
  }
  return { ok: true, reason: "profile_email_custom" };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} workosUserId
 * @param {Record<string, unknown>} patch
 */
export async function patchProfileByWorkOSId(admin, workosUserId, patch) {
  if (!admin || !workosUserId) return { ok: false, reason: "invalid" };
  const row = { ...patch, updated_at: new Date().toISOString() };
  const { error } = await admin.from(TABLE()).update(row).eq("workos_user_id", workosUserId);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

/**
 * Shallow-merge keys into torp_profiles.metadata for one user (service role).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 */
export async function mergeProfileMetadataByWorkOSId(admin, workosUserId, partialMeta) {
  if (!admin || !workosUserId || !partialMeta || typeof partialMeta !== "object") return { ok: false, reason: "invalid" };
  const row = await getProfileRowByWorkOSId(admin, workosUserId);
  if (!row) return { ok: false, reason: "no_profile" };
  const prev = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? { ...row.metadata } : {};
  const next = { ...prev, ...partialMeta };
  return patchProfileByWorkOSId(admin, workosUserId, { metadata: next });
}
