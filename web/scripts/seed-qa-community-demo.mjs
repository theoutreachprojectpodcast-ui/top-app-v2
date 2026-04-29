/**
 * Inserts approved community posts flagged is_demo_seed for QA / preview layout testing.
 *
 * Requirements:
 * - Run only when TOP_QA_SEED=1 or NEXT_PUBLIC_TOP_QA=1 or VERCEL_ENV=preview (or local dev with ALLOW_QA_COMMUNITY_SEED=1).
 * - Set TOP_QA_COMMUNITY_AUTHOR_PROFILE_IDS to one or more torp_profiles.id (uuid) values — demo or staff test profiles.
 *
 * Production: do not run. Public API hides is_demo_seed when shouldHideDemoCommunitySeeds() is true.
 */
import { createClient } from "@supabase/supabase-js";

function allowRun() {
  if (String(process.env.TOP_QA_SEED || "").trim() === "1") return true;
  if (String(process.env.NEXT_PUBLIC_TOP_QA || "").trim() === "1") return true;
  if (String(process.env.VERCEL_ENV || "").toLowerCase() === "preview") return true;
  if (String(process.env.ALLOW_QA_COMMUNITY_SEED || "").trim() === "1") return true;
  return false;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const authorIds = String(process.env.TOP_QA_COMMUNITY_AUTHOR_PROFILE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const stories = [
  {
    title: "Back to school drive hit our stretch goal",
    body: "We coordinated with three local pantries and kept the volunteer shifts under two hours each. The new intake form cut duplicate signups and the team finally had one source of truth for donations.",
    category: "success_story",
  },
  {
    title: "Peer support circle — what we learned in month one",
    body: "Small groups (six to eight) worked best when we assigned a facilitator who had done the training. We posted a standing agenda so newcomers knew what to expect, and we captured action items in the community thread after each meetup.",
    category: "success_story",
  },
  {
    title: "Veteran outreach: clinic navigation tips that actually stuck",
    body: "We printed a single trifold with QR codes to the three clinics we trust, plus a one-page eligibility checklist. Handing that out at the resource fair doubled follow-through compared to verbal directions alone.",
    category: "success_story",
  },
];

async function main() {
  if (!allowRun()) {
    console.error(
      "Refusing to seed: set TOP_QA_SEED=1, NEXT_PUBLIC_TOP_QA=1, VERCEL_ENV=preview, or ALLOW_QA_COMMUNITY_SEED=1 for local dev.",
    );
    process.exit(1);
  }
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  if (!authorIds.length) {
    console.error("Set TOP_QA_COMMUNITY_AUTHOR_PROFILE_IDS to comma-separated torp_profiles.id UUIDs.");
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data: profiles, error: pErr } = await admin
    .from("torp_profiles")
    .select("id,first_name,last_name,display_name,profile_photo_url,workos_user_id")
    .in("id", authorIds);
  if (pErr) {
    console.error(pErr.message);
    process.exit(1);
  }
  if (!profiles?.length) {
    console.error("No torp_profiles rows matched TOP_QA_COMMUNITY_AUTHOR_PROFILE_IDS.");
    process.exit(1);
  }

  let n = 0;
  for (let i = 0; i < stories.length; i++) {
    const profile = profiles[i % profiles.length];
    const displayName =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
      String(profile.display_name || "").trim() ||
      "QA demo member";
    const row = {
      author_profile_id: profile.id,
      author_id: String(profile.workos_user_id || `qa-seed-${profile.id}`).slice(0, 120),
      author_name: displayName,
      author_avatar_url: String(profile.profile_photo_url || ""),
      title: stories[i].title,
      body: stories[i].body,
      nonprofit_name: "",
      nonprofit_ein: null,
      category: stories[i].category,
      post_type: "share_story",
      show_author_name: true,
      link_url: "",
      photo_url: "",
      status: "approved",
      visibility: "community",
      like_count: 0,
      share_count: 0,
      is_demo_seed: true,
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from("community_posts").insert(row);
    if (error) {
      console.error("Insert failed:", error.message);
      process.exit(1);
    }
    n += 1;
  }
  console.log(`Inserted ${n} QA demo community posts (is_demo_seed=true).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
