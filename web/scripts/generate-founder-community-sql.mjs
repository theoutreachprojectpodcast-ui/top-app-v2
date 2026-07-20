/**
 * Writes qa_seed_company_community_posts_v07.sql
 * Run: node web/scripts/generate-founder-community-sql.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildFounderOnboardingPostRows } from "../src/features/community/data/founderOnboardingPosts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function esc(s) {
  return String(s).replace(/'/g, "''");
}

function rowSql(r) {
  return `(
  '${r.id}',
  null,
  '${esc(r.author_id)}',
  '${esc(r.author_name)}',
  '${esc(r.author_avatar_url)}',
  '${esc(r.title)}',
  '${esc(r.body)}',
  '${esc(r.category)}',
  '${esc(r.post_type)}',
  true,
  '${esc(r.link_url)}',
  '${esc(r.photo_url)}',
  'approved',
  'community',
  ${r.like_count},
  0,
  '${esc(r.reviewed_by)}',
  '${r.reviewed_at}'::timestamptz,
  '${r.published_at}'::timestamptz,
  false,
  false,
  now(),
  '${r.created_at}'::timestamptz
)`;
}

const rows = buildFounderOnboardingPostRows();
const values = rows.map(rowSql).join(",\n");

const sql = `-- tOP v0.7 QA content seed: Outreach Project moderator onboarding guides (Josh & Hodge).
-- Safe to re-run. Uses fixed ids + upsert; visible in public/community feed.
-- Avatar: /community/outreach-project-moderator.png (logo — profile only, not post media).

begin;

alter table if exists public.community_posts
  add column if not exists is_demo_seed boolean not null default false;

insert into public.community_posts (
  id,
  author_profile_id,
  author_id,
  author_name,
  author_avatar_url,
  title,
  body,
  category,
  post_type,
  show_author_name,
  link_url,
  photo_url,
  status,
  visibility,
  like_count,
  share_count,
  reviewed_by,
  reviewed_at,
  published_at,
  is_edited,
  is_demo_seed,
  updated_at,
  created_at
)
values
${values}
on conflict (id) do update set
  author_id = excluded.author_id,
  author_name = excluded.author_name,
  author_avatar_url = excluded.author_avatar_url,
  title = excluded.title,
  body = excluded.body,
  category = excluded.category,
  post_type = excluded.post_type,
  link_url = excluded.link_url,
  photo_url = excluded.photo_url,
  status = excluded.status,
  visibility = excluded.visibility,
  like_count = excluded.like_count,
  reviewed_by = excluded.reviewed_by,
  reviewed_at = excluded.reviewed_at,
  published_at = excluded.published_at,
  is_demo_seed = excluded.is_demo_seed,
  updated_at = now();

-- Retire legacy company posts that used brand logos in photo_url.
update public.community_posts
set deleted_at = now(), updated_at = now()
where author_id = 'company-top-app'
  and id not in (
    ${rows.map((r) => `'${r.id}'`).join(",\n    ")}
  )
  and deleted_at is null;

commit;
`;

const outPath = path.join(__dirname, "../supabase/qa_seed_company_community_posts_v07.sql");
fs.writeFileSync(outPath, sql, "utf8");
console.log(`Wrote ${outPath} (${rows.length} posts)`);
