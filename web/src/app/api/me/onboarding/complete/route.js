import { withAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient, profileTableName } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId, profileRowToClientDto } from "@/lib/profile/serverProfile";
import {
  defaultMembershipTierForIntent,
  normalizePublicAccountIntent,
  resolvePlatformRoleAfterTierChange,
} from "@/lib/account/accountModel";
import { postOnboardingDestination } from "@/lib/account/postOnboardingDestination";

const TIERS = new Set(["free", "support", "member", "sponsor"]);

function buildMeta(existing) {
  return existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
    ? { ...existing.metadata }
    : {};
}

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

  const existing = await getProfileRowByWorkOSId(admin, auth.user.id);
  const prevMeta = buildMeta(existing);

  const intentFromBody = normalizePublicAccountIntent(body.accountIntent);
  const existingIntent = existing?.account_intent != null ? String(existing.account_intent).toLowerCase().trim() : "";
  const accountIntentDb = intentFromBody || existingIntent || null;

  const sponsorPath = String(body.sponsorOnboardingPath || prevMeta.sponsorOnboardingPath || "")
    .trim()
    .toLowerCase();

  /** Sponsor partnership application — no Stripe; staff review queue (metadata + needs_review). */
  if (sponsorPath === "application" && (accountIntentDb === "sponsor_user" || existingIntent === "sponsor_user")) {
    prevMeta.sponsorOnboardingPath = "application";
    prevMeta.sponsorApplicationStatus = "pending";

    const patch = {
      onboarding_completed: true,
      onboarding_status: "needs_review",
      membership_tier: "free",
      membership_status: "none",
      membership_source: "manual",
      account_intent: "sponsor_user",
      platform_role: resolvePlatformRoleAfterTierChange(existing?.platform_role, "free"),
      metadata: prevMeta,
      updated_at: new Date().toISOString(),
    };

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
        ...patch,
      };
      const { error: insErr } = await admin.from(profileTableName()).insert(insertRow);
      if (insErr) {
        return Response.json({ error: "insert_failed", message: insErr.message }, { status: 500 });
      }
    } else {
      const { error } = await admin.from(profileTableName()).update(patch).eq("workos_user_id", auth.user.id);
      if (error) {
        return Response.json({ error: "update_failed", message: error.message }, { status: 500 });
      }
    }

    const next = await getProfileRowByWorkOSId(admin, auth.user.id);
    const dto = profileRowToClientDto(next);
    return Response.json({
      profile: dto,
      redirectPath: postOnboardingDestination({
        accountIntent: dto.accountIntent,
        platformRole: dto.platformRole,
        onboardingStatus: dto.onboardingStatus,
        sponsorOnboardingPath: dto.sponsorOnboardingPath,
      }),
    });
  }

  let requestedTier = typeof body.membershipTier === "string" ? body.membershipTier.toLowerCase() : "free";
  const intentForDefault = intentFromBody || existingIntent || null;
  if (intentForDefault && !body.membershipTier) {
    requestedTier = defaultMembershipTierForIntent(intentForDefault);
  }
  const safeTier = TIERS.has(requestedTier) ? requestedTier : "free";

  const requestedBillingStatus =
    safeTier === "free" ? "none" : typeof body.membershipStatus === "string" ? body.membershipStatus : "pending";

  /** If Stripe webhooks already advanced billing, do not overwrite with "pending". */
  let membership_status = requestedBillingStatus;
  let membership_tier = safeTier;
  if (existing && safeTier !== "free") {
    const live = String(existing.membership_status || "").toLowerCase();
    if (live === "active" || live === "past_due" || live === "incomplete") {
      membership_status = live;
      const existingTier = String(existing.membership_tier || "").toLowerCase();
      if (TIERS.has(existingTier) && existingTier !== "free") {
        membership_tier = existingTier;
      }
    }
  }

  if (sponsorPath === "subscription") {
    prevMeta.sponsorOnboardingPath = "subscription";
  }

  const inferredIntent =
    safeTier === "support"
      ? "support_user"
      : safeTier === "member"
        ? "member_user"
        : safeTier === "sponsor"
          ? "sponsor_user"
          : "free_user";
  const resolvedIntent = intentFromBody || (existingIntent && existingIntent !== "" ? existingIntent : inferredIntent);

  const platform_role = resolvePlatformRoleAfterTierChange(existing?.platform_role, membership_tier);

  const row = {
    onboarding_completed: true,
    membership_tier,
    membership_status,
    membership_source: safeTier === "free" ? "manual" : "onboarding",
    onboarding_status: "completed",
    account_intent: resolvedIntent,
    platform_role,
    metadata: prevMeta,
    updated_at: new Date().toISOString(),
  };

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
  const dto = profileRowToClientDto(next);
  return Response.json({
    profile: dto,
    redirectPath: postOnboardingDestination({
      accountIntent: dto.accountIntent,
      platformRole: dto.platformRole,
      onboardingStatus: dto.onboardingStatus,
      sponsorOnboardingPath: dto.sponsorOnboardingPath,
    }),
  });
}
