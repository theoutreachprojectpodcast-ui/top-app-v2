create table if not exists public.sponsors_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sponsor_type text,
  website_url text,
  logo_url text,
  background_image_url text,
  short_description text,
  long_description text,
  tagline text,
  instagram_url text,
  facebook_url text,
  linkedin_url text,
  twitter_url text,
  youtube_url text,
  additional_links jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  display_order integer not null default 0,
  warm_variant text,
  verified boolean not null default false,
  enrichment_status text not null default 'manual',
  last_enriched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sponsors_catalog_display_order_idx
  on public.sponsors_catalog (featured desc, display_order asc, name asc);

create index if not exists sponsors_catalog_slug_idx
  on public.sponsors_catalog (slug);
