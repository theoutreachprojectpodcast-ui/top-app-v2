import { createClient } from "@supabase/supabase-js";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { discoverChannelId, parseYoutubeFeed, youtubeFeedUrls } from "@/features/podcasts/domain/youtubeFeed";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isCommunityModeratorServer } from "@/lib/community/moderatorServer";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TABLE = "podcast_episodes";

export async function POST() {
  if (!URL || !KEY) return Response.json({ error: "Missing Supabase credentials." }, { status: 500 });
  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ error: "unauthorized", message: "Sign in to run podcast sync." }, { status: 401 });
  }
  const adminProfiles = createSupabaseAdminClient();
  const profileRow = adminProfiles ? await getProfileRowByWorkOSId(adminProfiles, auth.user.id) : null;
  if (!isCommunityModeratorServer({ email: auth.user.email, workosUserId: auth.user.id, profileRow })) {
    const hint =
      process.env.NODE_ENV === "development"
        ? "Add your WorkOS sign-in email to COMMUNITY_MODERATOR_EMAILS in .env.local."
        : undefined;
    return Response.json(
      { error: "forbidden", message: "Moderator access required.", ...(hint ? { hint } : {}) },
      { status: 403 }
    );
  }
  const channelId = await discoverChannelId();
  let episodes = [];
  for (const feedUrl of youtubeFeedUrls(channelId)) {
    const res = await fetch(feedUrl, { redirect: "follow" });
    if (!res.ok) continue;
    const xml = await res.text();
    episodes = parseYoutubeFeed(xml).slice(0, 100);
    if (episodes.length) break;
  }
  if (!episodes.length) return Response.json({ error: "Unable to load YouTube feed." }, { status: 500 });
  const supabase = createClient(URL, KEY);
  const { error } = await supabase.from(TABLE).upsert(episodes, { onConflict: "youtube_video_id" });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, synced: episodes.length });
}
