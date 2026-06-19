import { getWorkOS } from "@workos-inc/authkit-nextjs";
import Stripe from "stripe";
import { isDefaultApprovedAdminEmail } from "@/lib/admin/adminPolicy";
import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";
import { profileTableName } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { stripeSecretConfigured } from "@/lib/billing/stripeConfig";

const SAVED_ORG_TABLE = process.env.NEXT_PUBLIC_SAVED_ORG_TABLE || "top_app_saved_org_eins";

/**
 * Permanently delete a WorkOS user's app data and WorkOS account.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('@workos-inc/node').User} user
 */
export async function deleteUserAccount(admin, user) {
  const workosUserId = String(user?.id || "").trim();
  if (!workosUserId) {
    return { ok: false, error: "missing_user_id" };
  }

  const profileRow = await getProfileRowByWorkOSId(admin, workosUserId);
  if (
    isPlatformAdminServer({
      email: user.email,
      workosUserId,
      profileRow,
    }) ||
    isDefaultApprovedAdminEmail(user.email)
  ) {
    return { ok: false, error: "admin_account_protected", status: 403 };
  }

  const profileId = profileRow?.id ? String(profileRow.id) : "";
  const warnings = [];

  await cancelStripeBilling(profileRow, warnings);
  await deleteProfilePhotos(admin, workosUserId, warnings);
  await deleteSavedOrganizations(admin, workosUserId, warnings);
  await eraseCommunityPresence(admin, { workosUserId, profileId }, warnings);
  await deletePodcastCheckoutEvents(admin, workosUserId, warnings);
  await anonymizeBillingRecords(admin, workosUserId, warnings);
  await anonymizeSponsorApplications(admin, workosUserId, warnings);

  if (profileId) {
    const { error } = await admin.from(profileTableName()).delete().eq("id", profileId);
    if (error) {
      return { ok: false, error: "profile_delete_failed", message: error.message, status: 500 };
    }
  } else {
    const { error } = await admin.from(profileTableName()).delete().eq("workos_user_id", workosUserId);
    if (error) {
      return { ok: false, error: "profile_delete_failed", message: error.message, status: 500 };
    }
  }

  try {
    await getWorkOS().userManagement.deleteUser(workosUserId);
  } catch (err) {
    console.error("[deleteUserAccount] WorkOS delete failed:", err);
    return {
      ok: false,
      error: "workos_delete_failed",
      message: "Your app data was removed, but sign-in could not be fully revoked. Contact support.",
      status: 502,
      warnings,
    };
  }

  return { ok: true, warnings };
}

async function cancelStripeBilling(profileRow, warnings) {
  if (!stripeSecretConfigured() || !profileRow) return;
  const customerId = String(profileRow.stripe_customer_id || "").trim();
  const subscriptionId = String(profileRow.stripe_subscription_id || "").trim();
  if (!customerId && !subscriptionId) return;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    if (subscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscriptionId);
      } catch (err) {
        warnings.push(`stripe_subscription_cancel:${err?.message || "failed"}`);
      }
    }
    if (customerId) {
      try {
        await stripe.customers.del(customerId);
      } catch (err) {
        warnings.push(`stripe_customer_delete:${err?.message || "failed"}`);
      }
    }
  } catch (err) {
    warnings.push(`stripe:${err?.message || "failed"}`);
  }
}

async function deleteProfilePhotos(admin, workosUserId, warnings) {
  const safePrefix = String(workosUserId || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 128);
  if (!safePrefix) return;

  try {
    const { data: objects, error: listErr } = await admin.storage.from("profile-photos").list(safePrefix, {
      limit: 100,
    });
    if (listErr) {
      warnings.push(`profile_photos_list:${listErr.message}`);
      return;
    }
    const paths = (objects || [])
      .map((obj) => (obj?.name ? `${safePrefix}/${obj.name}` : ""))
      .filter(Boolean);
    if (!paths.length) return;
    const { error: removeErr } = await admin.storage.from("profile-photos").remove(paths);
    if (removeErr) warnings.push(`profile_photos_remove:${removeErr.message}`);
  } catch (err) {
    warnings.push(`profile_photos:${err?.message || "failed"}`);
  }
}

async function deleteSavedOrganizations(admin, workosUserId, warnings) {
  const { error } = await admin.from(SAVED_ORG_TABLE).delete().eq("user_id", workosUserId);
  if (error) warnings.push(`saved_orgs:${error.message}`);
}

async function eraseCommunityPresence(admin, { workosUserId, profileId }, warnings) {
  const now = new Date().toISOString();

  if (profileId) {
    const { error: reactionsErr } = await admin
      .from("community_post_reactions")
      .delete()
      .eq("profile_id", profileId);
    if (reactionsErr) warnings.push(`community_reactions:${reactionsErr.message}`);
  }

  const { error: likesErr } = await admin.from("community_post_likes").delete().eq("liker_id", workosUserId);
  if (likesErr) warnings.push(`community_likes:${likesErr.message}`);

  const { error: followsErr } = await admin
    .from("community_follows")
    .delete()
    .or(`follower_id.eq.${workosUserId},following_id.eq.${workosUserId}`);
  if (followsErr) warnings.push(`community_follows:${followsErr.message}`);

  const postPatch = {
    deleted_at: now,
    status: "hidden",
    visibility: "private",
    author_id: "deleted-user",
    author_name: "Deleted member",
    author_avatar_url: "",
    author_profile_id: null,
    body: "[Removed — account deleted]",
    title: "",
    photo_url: "",
    updated_at: now,
  };

  const filters = [`author_id.eq.${workosUserId}`];
  if (profileId) filters.push(`author_profile_id.eq.${profileId}`);

  const { error: postsErr } = await admin
    .from("community_posts")
    .update(postPatch)
    .or(filters.join(","));
  if (postsErr) warnings.push(`community_posts:${postsErr.message}`);
}

async function deletePodcastCheckoutEvents(admin, workosUserId, warnings) {
  const { error } = await admin.from("podcast_sponsor_checkout_events").delete().eq("workos_user_id", workosUserId);
  if (error) warnings.push(`podcast_checkout_events:${error.message}`);
}

async function anonymizeBillingRecords(admin, workosUserId, warnings) {
  const { error } = await admin
    .from("billing_records")
    .update({
      workos_user_id: "",
      recipient_email: "deleted@theoutreachproject.app",
      recipient_name: "Deleted account",
      updated_at: new Date().toISOString(),
    })
    .eq("workos_user_id", workosUserId);
  if (error && !/does not exist|relation/i.test(error.message)) {
    warnings.push(`billing_records:${error.message}`);
  }
}

async function anonymizeSponsorApplications(admin, workosUserId, warnings) {
  const { error } = await admin
    .from("sponsor_applications")
    .update({ applicant_workos_user_id: null })
    .eq("applicant_workos_user_id", workosUserId);
  if (error) warnings.push(`sponsor_applications:${error.message}`);
}
