-- Universal page content blocks + admin media library (additive, safe to re-run).
-- Run after admin_cms_v05_all_in_one.sql and admin_audit_logs_v01.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1) Site-wide copy blocks (wizard + section admins)
-- ---------------------------------------------------------------------------
create table if not exists public.page_content_blocks (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  section_key text not null default 'main',
  block_type text not null default 'copy'
    check (block_type in (
      'copy', 'hero', 'cta', 'testimonial', 'card', 'carousel',
      'blog', 'featured', 'link', 'image_block', 'video_block', 'other'
    )),
  title text not null default '',
  subtitle text not null default '',
  body_html text not null default '',
  body_text text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'in_review', 'approved', 'archived')),
  display_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  target_admin_route text not null default '',
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists page_content_blocks_page_idx
  on public.page_content_blocks (page_key, section_key, status, display_order);

-- ---------------------------------------------------------------------------
-- 2) Uploaded admin media assets (Supabase Storage + registry row)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null default '',
  public_url text not null,
  filename text not null default '',
  mime_type text not null default '',
  byte_size integer not null default 0,
  alt_text text not null default '',
  tags text[] not null default '{}'::text[],
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists admin_media_assets_created_idx
  on public.admin_media_assets (created_at desc);

-- ---------------------------------------------------------------------------
-- 3) Storage bucket: admin-media (public read for site assets)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'admin-media',
  'admin-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
where not exists (select 1 from storage.buckets b where b.id = 'admin-media');

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'storage'
      and cls.relname = 'objects'
      and pol.polname = 'admin_media_public_read'
  ) then
    create policy admin_media_public_read
      on storage.objects
      for select
      to public
      using (bucket_id = 'admin-media');
  end if;
end
$$;

-- Service role uploads; no anon write policies (admin API uses service role).

alter table public.page_content_blocks enable row level security;
alter table public.admin_media_assets enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relname = 'page_content_blocks'
      and pol.polname = 'page_content_blocks_no_client_access'
  ) then
    create policy page_content_blocks_no_client_access on public.page_content_blocks
      as permissive for all to public using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relname = 'admin_media_assets'
      and pol.polname = 'admin_media_assets_no_client_access'
  ) then
    create policy admin_media_assets_no_client_access on public.admin_media_assets
      as permissive for all to public using (false) with check (false);
  end if;
end
$$;

commit;
