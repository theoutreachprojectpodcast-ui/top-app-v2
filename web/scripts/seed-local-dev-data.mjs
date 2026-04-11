/**
 * Local-only rich data seed. Every torp_profiles row and community author_id uses real WorkOS user ids.
 *
 * Required:
 *   - NODE_ENV !== "production"
 *   - TORP_LOCAL_DATA_SEED=1
 *   - TORP_SEED_COMMUNITY_AUTHOR_WORKOS_USER_IDS — 1–3 comma-separated WorkOS user ids (e.g. user_01ABC…).
 *     Use the same id repeated if you only have one test user: user_01ABC,user_01ABC,user_01ABC
 *
 * Optional:
 *   - TORP_SEED_TARGET_WORKOS_USER_ID — saved orgs + sample notifications (defaults to first author id)
 *   - TORP_SEED_TARGET_EMAIL — set on target profile upsert when that id is seeded
 *   - TORP_SEED_SPONSOR_APPLICANT_WORKOS_USER_ID — sets applicant_workos_user_id on the mission_partner seed row
 *
 * Run: TORP_LOCAL_DATA_SEED=1 TORP_SEED_COMMUNITY_AUTHOR_WORKOS_USER_IDS=user_a,user_b,user_c pnpm seed:local-dev
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SEED_TAG = "torp_local_data_seed_v1";

const POST_IDS = {
  approved1: "b2000000-0000-4000-8000-000000000001",
  approved2: "b2000000-0000-4000-8000-000000000002",
  approved3: "b2000000-0000-4000-8000-000000000003",
  pending1: "b2000000-0000-4000-8000-000000000004",
  pending2: "b2000000-0000-4000-8000-000000000005",
  rejected1: "b2000000-0000-4000-8000-000000000006",
  approvedEin: "b2000000-0000-4000-8000-000000000007",
};

const SPONSOR_APP_IDS = {
  mission: "c3000000-0000-4000-8000-000000000001",
  podcast: "c3000000-0000-4000-8000-000000000002",
};

const TRUSTED_RESOURCE_APP_SEED_ID = "c3000000-0000-4000-8000-000000000010";

const SAMPLE_EIN = "131234567";

function loadDotEnvLocal() {
  const envPath = path.join(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const s = String(line || "").trim();
    if (!s || s.startsWith("#")) continue;
    const idx = s.indexOf("=");
    if (idx <= 0) continue;
    const key = s.slice(0, idx).trim();
    const value = s.slice(idx + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnvLocal();

function assertLocalOnly() {
  if (process.env.NODE_ENV === "production") {
    console.error("[torp-seed] Refusing: NODE_ENV is production.");
    process.exit(1);
  }
  if (process.env.TORP_LOCAL_DATA_SEED !== "1") {
    console.error("[torp-seed] Refusing: set TORP_LOCAL_DATA_SEED=1 to run this seed.");
    process.exit(1);
  }
}

/** WorkOS User object ids are typically `user_<alphanumeric>`. */
function assertWorkOSUserId(id, label) {
  const s = String(id || "").trim();
  if (!/^user_[a-zA-Z0-9]+$/.test(s)) {
    console.error(
      `[torp-seed] Invalid ${label}: "${id}". Expected a WorkOS user id (form user_… from the WorkOS dashboard).`,
    );
    process.exit(1);
  }
  return s;
}

/**
 * @returns {string[]} exactly three WorkOS user ids (pad by repeating last if 1–2 provided)
 */
function parseCommunityAuthorWorkOSIds() {
  const raw = String(
    process.env.TORP_SEED_COMMUNITY_AUTHOR_WORKOS_USER_IDS ||
      process.env.TORP_SEED_WORKOS_USER_IDS ||
      "",
  ).trim();
  const parts = raw
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 1) {
    console.error(
      "[torp-seed] Set TORP_SEED_COMMUNITY_AUTHOR_WORKOS_USER_IDS to 1–3 WorkOS user ids (comma-separated).",
    );
    console.error(
      "[torp-seed] Create test users in the WorkOS dashboard or sign in once and copy the id from the user payload.",
    );
    process.exit(1);
  }
  for (const p of parts) assertWorkOSUserId(p, "TORP_SEED_COMMUNITY_AUTHOR_WORKOS_USER_IDS entry");
  if (parts.length > 3) {
    console.warn("[torp-seed] More than 3 author ids provided; using the first 3.");
  }
  const three = parts.slice(0, 3);
  while (three.length < 3) three.push(three[three.length - 1]);
  return three;
}

function nowIso(offsetMin = 0) {
  return new Date(Date.now() + offsetMin * 60 * 1000).toISOString();
}

const PERSONAS = [
  {
    emailSuffix: "author1.seed@example.test",
    display_name: "Alex Rivera",
    first_name: "Alex",
    last_name: "Rivera",
    banner: "Veteran · Peer support advocate",
    bio: "Transitioning with purpose — sharing what worked for me in the hope it helps someone else.",
    membership_source: "manual",
    stripe_customer_id: null,
    metadataExtra: {
      identityRole: "Veteran",
      missionStatement: "Make credible help easier to find for every family in transition.",
      city: "San Antonio",
      state: "TX",
      causes: "Housing stability, behavioral health navigation",
      skills: "Logistics, mentoring, public speaking",
    },
  },
  {
    emailSuffix: "author2.seed@example.test",
    display_name: "Jordan Lee",
    first_name: "Jordan",
    last_name: "Lee",
    banner: "First responder · Spouse & caregiver",
    bio: "Here to normalize asking for help and to lift organizations that show up with clarity.",
    membership_source: "manual",
    stripe_customer_id: null,
    metadataExtra: {
      identityRole: "First responder family",
      city: "Columbus",
      state: "OH",
      causes: "Crisis resources, legal aid navigation",
    },
  },
  {
    emailSuffix: "author3.seed@example.test",
    display_name: "Sam Wilson",
    first_name: "Sam",
    last_name: "Wilson",
    banner: "Nonprofit program lead",
    bio: "Building bridges between mission-driven orgs and the people they serve.",
    membership_source: "stripe",
    stripe_customer_id: "cus_localSeedSynthetic",
    metadataExtra: {
      identityRole: "Nonprofit leader",
      organizationAffiliation: "Community resilience nonprofit",
      city: "Denver",
      state: "CO",
    },
  },
];

function personaRow(workosUserId, personaIndex) {
  const p = PERSONAS[personaIndex] || PERSONAS[0];
  return {
    workos_user_id: workosUserId,
    email: p.emailSuffix,
    display_name: p.display_name,
    first_name: p.first_name,
    last_name: p.last_name,
    membership_tier: "member",
    membership_status: "active",
    membership_source: p.membership_source,
    onboarding_completed: true,
    banner: p.banner,
    bio: p.bio,
    theme: "clean",
    stripe_customer_id: p.stripe_customer_id,
    metadata: {
      torp_local_data_seed: SEED_TAG,
      ...p.metadataExtra,
    },
  };
}

function targetProfileUpsert(workosUserId) {
  const row = {
    workos_user_id: workosUserId,
    display_name: "Dev User (seeded)",
    first_name: "Dev",
    last_name: "User",
    membership_tier: "member",
    membership_status: "active",
    membership_source: "onboarding",
    onboarding_completed: true,
    banner: "Local development profile — seeded",
    bio: "Upserted by scripts/seed-local-dev-data.mjs for TORP_SEED_TARGET_WORKOS_USER_ID (WorkOS-aligned).",
    theme: "clean",
    stripe_customer_id: "cus_localSeedTarget",
    metadata: {
      torp_local_data_seed: SEED_TAG,
      identityRole: "Supporter",
      missionStatement: "Testing the full profile + membership + community stack locally.",
      city: "Austin",
      state: "TX",
      causes: "Veteran services, trusted navigation",
      volunteerInterests: "Mentoring, event support",
      contributionSummary: "Seeded for localhost UI and notification checks.",
    },
    updated_at: nowIso(),
  };
  const em = String(process.env.TORP_SEED_TARGET_EMAIL || "").trim();
  if (em) row.email = em;
  return row;
}

/**
 * Unique profile upserts: one row per distinct WorkOS id. Persona chosen by first slot index that references that id.
 * If target id is not among authors, add a dedicated target row.
 */
function buildProfileUpsertRows(authorIds, targetWorkosId) {
  const unique = new Map();
  for (let i = 0; i < authorIds.length; i++) {
    const wid = authorIds[i];
    if (!unique.has(wid)) unique.set(wid, personaRow(wid, i));
  }
  const rows = [...unique.values()];
  if (targetWorkosId && !unique.has(targetWorkosId)) {
    assertWorkOSUserId(targetWorkosId, "TORP_SEED_TARGET_WORKOS_USER_ID");
    rows.push(targetProfileUpsert(targetWorkosId));
  } else if (targetWorkosId && unique.has(targetWorkosId)) {
    const em = String(process.env.TORP_SEED_TARGET_EMAIL || "").trim();
    const idx = rows.findIndex((r) => r.workos_user_id === targetWorkosId);
    if (idx >= 0 && em) rows[idx].email = em;
  }
  return rows;
}

async function upsertProfiles(admin, authorIds, targetWorkosId) {
  const rows = buildProfileUpsertRows(authorIds, targetWorkosId);
  const { error } = await admin.from("torp_profiles").upsert(rows, { onConflict: "workos_user_id" });
  if (error) throw new Error(`torp_profiles: ${error.message}`);

  const ids = {};
  const allWids = [...new Set([...authorIds, ...(targetWorkosId ? [targetWorkosId] : [])])];
  for (const wid of allWids) {
    const { data, error: qe } = await admin.from("torp_profiles").select("id").eq("workos_user_id", wid).maybeSingle();
    if (qe) throw new Error(`torp_profiles lookup ${wid}: ${qe.message}`);
    if (data?.id) ids[wid] = data.id;
  }
  return ids;
}

function buildPosts(profileIds, authorIds) {
  const a1 = profileIds[authorIds[0]];
  const a2 = profileIds[authorIds[1]];
  const a3 = profileIds[authorIds[2]];

  const display = (i) => PERSONAS[i].display_name;

  const base = (id, overrides) => ({
    id,
    author_profile_id: overrides.author_profile_id,
    author_id: overrides.author_workos_id,
    author_name: overrides.author_name,
    author_avatar_url: "",
    title: overrides.title,
    body: overrides.body,
    nonprofit_ein: overrides.nonprofit_ein ?? null,
    nonprofit_name: overrides.nonprofit_name ?? "",
    category: overrides.category,
    post_type: overrides.post_type || "share_story",
    show_author_name: true,
    link_url: "",
    photo_url: "",
    status: overrides.status,
    visibility: "community",
    like_count: overrides.like_count ?? 0,
    share_count: 0,
    moderation_notes: overrides.moderation_notes ?? null,
    reviewed_by: overrides.reviewed_by ?? null,
    reviewed_at: overrides.reviewed_at ?? null,
    published_at: overrides.published_at ?? null,
    deleted_at: null,
    is_edited: false,
    updated_at: nowIso(),
    created_at: overrides.created_at ?? nowIso(-120),
  });

  return [
    base(POST_IDS.approved1, {
      author_profile_id: a1,
      author_workos_id: authorIds[0],
      author_name: display(0),
      title: "Found a nonprofit that actually picked up the phone",
      body: "After a few dead ends, I reached an organization through the directory that answered on the first try. They walked me through intake without making me feel rushed. Sharing in case someone else is stuck in the same loop I was.",
      category: "success_story",
      status: "approved",
      reviewed_by: "local-seed",
      reviewed_at: nowIso(-100),
      published_at: nowIso(-100),
      like_count: 3,
    }),
    base(POST_IDS.approved2, {
      author_profile_id: a2,
      author_workos_id: authorIds[1],
      author_name: display(1),
      title: "Trusted Resources saved me a Saturday of guesswork",
      body: "I started with the Trusted Resources tab and cross-checked two orgs in the directory. Having a short list of vetted names made it easier to involve my partner in the decision without drowning in tabs.",
      category: "thank_you",
      status: "approved",
      reviewed_by: "local-seed",
      reviewed_at: nowIso(-90),
      published_at: nowIso(-90),
      like_count: 1,
    }),
    base(POST_IDS.approved3, {
      author_profile_id: a3,
      author_workos_id: authorIds[2],
      author_name: display(2),
      title: "Why moderation matters for community posts",
      body: "As someone who runs programs on the ground, I appreciate that stories here are reviewed before they go public. It keeps the tone respectful and reduces noise for people who are already under stress.",
      category: "community_update",
      post_type: "community_update",
      status: "approved",
      reviewed_by: "local-seed",
      reviewed_at: nowIso(-80),
      published_at: nowIso(-80),
    }),
    base(POST_IDS.approvedEin, {
      author_profile_id: a1,
      author_workos_id: authorIds[0],
      author_name: display(0),
      title: "Shout-out to a small org doing big work",
      body: "I want to recognize a local nonprofit that helped my family with paperwork and referrals. They were patient with every question. If you are browsing the directory, save a few favorites and follow up — it is worth it.",
      nonprofit_ein: SAMPLE_EIN,
      nonprofit_name: "Sample Seeded Organization (local)",
      category: "nonprofit_impact",
      status: "approved",
      reviewed_by: "local-seed",
      reviewed_at: nowIso(-70),
      published_at: nowIso(-70),
    }),
    base(POST_IDS.pending1, {
      author_profile_id: a2,
      author_workos_id: authorIds[1],
      author_name: display(1),
      title: "Pending review: resources for night-shift workers",
      body: "Drafted a short list of ideas for peers on rotating shifts who need mental health access. Submitting for moderator review so the links can be verified before the community sees them.",
      category: "resource_help",
      status: "pending_review",
    }),
    base(POST_IDS.pending2, {
      author_profile_id: a3,
      author_workos_id: authorIds[2],
      author_name: display(2),
      title: "Pending: event recap draft",
      body: "Sharing a quick recap from a volunteer fair. Happy to trim or add citations once a moderator has a look — goal is to highlight organizations that showed up for veterans and first responders.",
      category: "success_story",
      status: "pending_review",
    }),
    base(POST_IDS.rejected1, {
      author_profile_id: a1,
      author_workos_id: authorIds[0],
      author_name: display(0),
      title: "Rejected sample (local seed)",
      body: "This post is intentionally rejected for local testing of moderation states. It should not appear in the public feed. Body kept over twenty chars for realism.",
      category: "success_story",
      status: "rejected",
      reviewed_by: "local-seed",
      reviewed_at: nowIso(-60),
      moderation_notes: "Seeded rejection — promotional tone; resubmit without external fundraising links.",
    }),
  ];
}

async function seedCommunity(admin, profileIds, authorIds) {
  const posts = buildPosts(profileIds, authorIds);
  const { error } = await admin.from("community_posts").upsert(posts, { onConflict: "id" });
  if (error) {
    if (String(error.message || "").includes("community_posts")) {
      console.warn("[torp-seed] skip community_posts:", error.message);
      return;
    }
    throw error;
  }
  console.log(`[torp-seed] community_posts upserted: ${posts.length} (author_id = WorkOS user id)`);

  const a1 = profileIds[authorIds[0]];
  const a2 = profileIds[authorIds[1]];
  const a3 = profileIds[authorIds[2]];
  const reactions = [
    { post_id: POST_IDS.approved1, profile_id: a2, reaction_type: "like" },
    { post_id: POST_IDS.approved1, profile_id: a3, reaction_type: "like" },
    { post_id: POST_IDS.approved2, profile_id: a1, reaction_type: "like" },
  ].filter((r) => r.profile_id);

  if (!reactions.length) return;

  const { error: re } = await admin.from("community_post_reactions").upsert(reactions, {
    onConflict: "post_id,profile_id,reaction_type",
  });
  if (re) {
    console.warn("[torp-seed] skip community_post_reactions:", re.message);
    return;
  }
  console.log(`[torp-seed] community_post_reactions upserted: ${reactions.length}`);

  await admin.from("community_posts").update({ like_count: 3 }).eq("id", POST_IDS.approved1);
  await admin.from("community_posts").update({ like_count: 1 }).eq("id", POST_IDS.approved2);
}

async function seedSavedOrgs(admin, workosUserId) {
  assertWorkOSUserId(workosUserId, "saved-orgs user_id");
  const SAVED_TABLE = process.env.NEXT_PUBLIC_SAVED_ORG_TABLE || "top_app_saved_org_eins";
  const rows = [
    { user_id: workosUserId, ein: SAMPLE_EIN, sort_order: 0 },
    { user_id: workosUserId, ein: "131234568", sort_order: 1 },
  ];
  const { error: del } = await admin.from(SAVED_TABLE).delete().eq("user_id", workosUserId);
  if (del && !String(del.message || "").includes("does not exist")) {
    console.warn("[torp-seed] saved orgs delete:", del.message);
  }
  const { error } = await admin.from(SAVED_TABLE).insert(rows);
  if (error) {
    console.warn("[torp-seed] skip saved orgs:", error.message);
    return;
  }
  console.log(`[torp-seed] ${SAVED_TABLE} inserted: ${rows.length} (user_id = WorkOS user id)`);
}

async function seedSponsorApplications(admin) {
  const applicantWid = String(process.env.TORP_SEED_SPONSOR_APPLICANT_WORKOS_USER_ID || "").trim();
  if (applicantWid) assertWorkOSUserId(applicantWid, "TORP_SEED_SPONSOR_APPLICANT_WORKOS_USER_ID");

  const rows = [
    {
      id: SPONSOR_APP_IDS.mission,
      first_name: "Riley",
      last_name: "Nguyen",
      email: "riley.nguyen.seed@example.test",
      phone: "555-0100",
      company_name: "Northwind Community Partners",
      company_website: "https://example.test/northwind",
      company_type: "LLC",
      city: "Portland",
      state: "OR",
      company_description: "Regional marketing collective supporting mission-driven brands.",
      contact_role: "Partnerships lead",
      sponsor_family: "mission_partner",
      sponsor_program_type: "main_app",
      sponsor_tier_id: "tier_seed_mission",
      sponsor_tier_name: "Mission Partner — Annual",
      sponsor_tier_amount: 250000,
      sponsor_interest_notes: "Interested in trusted directory placement and community spotlights.",
      audience_goals: "Reach veterans and first responder families in the Mountain West.",
      highlights_requested: "Logo on partners page; quarterly impact story.",
      placements_requested: ["web", "newsletter"],
      activation_requests: "Co-branded resource week in Q3 (local)",
      assets_ready: "vector_logo, brand_guidelines",
      brand_links: "https://example.test/press",
      additional_notes: "Seeded row for localhost admin review queues.",
      agreed_to_terms: true,
      agreed_demo_payment: true,
      payment_status: "unpaid",
      payment_demo_status: "demo_completed",
      application_status: "submitted",
      invite_status: "none",
      ...(applicantWid ? { applicant_workos_user_id: applicantWid } : {}),
    },
    {
      id: SPONSOR_APP_IDS.podcast,
      first_name: "Casey",
      last_name: "Brooks",
      email: "casey.brooks.seed@example.test",
      company_name: "Harborlight Audio",
      company_website: "https://example.test/harborlight",
      sponsor_family: "sponsor",
      sponsor_program_type: "podcast",
      sponsor_tier_id: "tier_seed_pod",
      sponsor_tier_name: "Podcast — Supporter",
      sponsor_tier_amount: 50000,
      sponsor_interest_notes: "Seeded podcast sponsor application for local UI.",
      agreed_to_terms: true,
      agreed_demo_payment: false,
      payment_status: "unpaid",
      payment_demo_status: "unpaid",
      application_status: "in_review",
      invite_status: "none",
      placements_requested: [],
    },
  ];
  const { error } = await admin.from("sponsor_applications").upsert(rows, { onConflict: "id" });
  if (error) {
    console.warn("[torp-seed] skip sponsor_applications:", error.message);
    return;
  }
  console.log(`[torp-seed] sponsor_applications upserted: ${rows.length}`);
}

async function seedTrustedResourceApplications(admin) {
  const row = {
    id: TRUSTED_RESOURCE_APP_SEED_ID,
    organization_path: "new",
    organization_id: null,
    organization_name: "Riverside Veteran Services Collective",
    applicant_first_name: "Morgan",
    applicant_last_name: "Patel",
    applicant_email: "morgan.patel.seed@example.test",
    applicant_phone: "555-0101",
    website: "https://example.test/riverside-vsc",
    city: "Tampa",
    state: "FL",
    nonprofit_type: "501(c)(3) social services",
    why_good_fit: "We run weekly navigation clinics and have strong referral relationships with VA and union locals.",
    who_you_serve: "Post-9/11 veterans and transitioning service members in the Gulf Coast region.",
    services_offered: "Case management, benefits navigation, peer groups, employment readiness workshops.",
    veteran_support_experience: "Staff includes three veterans; board includes two retired senior NCOs.",
    first_responder_support_experience: "Partner EMT-B program for spouses; law enforcement family nights quarterly.",
    community_impact: "Served 1,200 households last fiscal year with 86% reporting improved stability at 90 days.",
    why_join_trusted_resources: "We want to be discoverable alongside other vetted orgs and reduce duplicate intakes.",
    references_or_links: "https://example.test/annual-report (sample)",
    agreed_to_values: true,
    agreed_info_accuracy: true,
    application_fee_status: "paid",
    payment_demo_status: "demo_completed",
    review_status: "submitted",
  };
  const { error } = await admin.from("trusted_resource_applications").upsert([row], { onConflict: "id" });
  if (error) {
    console.warn("[torp-seed] skip trusted_resource_applications:", error.message);
    return;
  }
  console.log("[torp-seed] trusted_resource_applications upserted: 1");
}

async function seedOrgUpdate(admin) {
  const row = {
    ein: SAMPLE_EIN,
    headline: "Sample org listing refreshed (local seed)",
    summary: "Seeded public update row to exercise favorite-based notifications in development.",
    link_path: `/nonprofit/13-1234567`,
    source_type: "local_dev_seed",
  };
  const { error } = await admin.from("torp_org_public_updates").insert(row);
  if (error) {
    if (String(error.code) === "23505" || String(error.message || "").includes("duplicate")) {
      console.log("[torp-seed] torp_org_public_updates: duplicate skipped");
      return;
    }
    console.warn("[torp-seed] skip torp_org_public_updates:", error.message);
    return;
  }
  console.log("[torp-seed] torp_org_public_updates inserted: 1");
}

async function clearSeedNotifications(admin, profileId) {
  const { error } = await admin
    .from("torp_platform_notifications")
    .delete()
    .eq("recipient_profile_id", profileId)
    .contains("metadata", { torp_local_data_seed: SEED_TAG });
  if (error) console.warn("[torp-seed] notification cleanup:", error.message);
}

async function seedNotifications(admin, targetProfileId) {
  if (!targetProfileId) return;

  await clearSeedNotifications(admin, targetProfileId);

  const now = nowIso();
  const rows = [
    {
      recipient_profile_id: targetProfileId,
      audience_scope: "user",
      notification_type: "community_post_approved",
      title: "Your story is live",
      message: "Moderators approved your community post (seeded sample for localhost).",
      link_path: "/community",
      entity_type: "community_post",
      entity_id: POST_IDS.approved1,
      status: "unread",
      priority: "normal",
      delivered_in_app_at: now,
      delivered_email_at: null,
      metadata: { torp_local_data_seed: SEED_TAG },
      created_at: now,
      updated_at: now,
    },
    {
      recipient_profile_id: targetProfileId,
      audience_scope: "user",
      notification_type: "favorite_org_updated",
      title: "An organization you follow has an update",
      message: "Seeded org update for EIN 13-1234567 — open the listing to see details.",
      link_path: "/nonprofit/13-1234567",
      entity_type: "nonprofit_ein",
      entity_id: SAMPLE_EIN,
      status: "unread",
      priority: "normal",
      delivered_in_app_at: now,
      delivered_email_at: null,
      metadata: { torp_local_data_seed: SEED_TAG, ein: SAMPLE_EIN },
      created_at: now,
      updated_at: now,
    },
    {
      recipient_profile_id: targetProfileId,
      audience_scope: "user",
      notification_type: "membership_charge_upcoming",
      title: "Upcoming membership charge (sample)",
      message: "This is a seeded billing reminder for UI testing — not from Stripe.",
      link_path: "/profile",
      entity_type: "local_seed",
      entity_id: "membership-upcoming-seed",
      status: "read",
      priority: "low",
      read_at: now,
      delivered_in_app_at: now,
      delivered_email_at: null,
      metadata: { torp_local_data_seed: SEED_TAG },
      created_at: now,
      updated_at: now,
    },
  ];

  const { error } = await admin.from("torp_platform_notifications").insert(rows);
  if (error) {
    console.warn("[torp-seed] skip torp_platform_notifications:", error.message);
    return;
  }
  console.log(`[torp-seed] torp_platform_notifications inserted: ${rows.length} (target user)`);
}

async function main() {
  assertLocalOnly();

  const authorIds = parseCommunityAuthorWorkOSIds();
  const targetExplicit = String(process.env.TORP_SEED_TARGET_WORKOS_USER_ID || "").trim();
  const targetWorkos = targetExplicit || authorIds[0];
  if (targetExplicit) assertWorkOSUserId(targetExplicit, "TORP_SEED_TARGET_WORKOS_USER_ID");

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[torp-seed] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  console.log("[torp-seed] Community authors (WorkOS user ids):", authorIds.join(", "));
  console.log("[torp-seed] Target for saved orgs + notifications:", targetWorkos);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  console.log("[torp-seed] Upserting torp_profiles…");
  const profileIds = await upsertProfiles(admin, authorIds, targetWorkos);

  console.log("[torp-seed] Seeding community…");
  await seedCommunity(admin, profileIds, authorIds);

  await seedSponsorApplications(admin);
  await seedTrustedResourceApplications(admin);
  await seedOrgUpdate(admin);

  if (profileIds[targetWorkos]) {
    await seedSavedOrgs(admin, targetWorkos);
    await seedNotifications(admin, profileIds[targetWorkos]);
  }

  console.log("[torp-seed] Done.");
}

main().catch((e) => {
  console.error("[torp-seed] Failed:", e.message || e);
  process.exit(1);
});
