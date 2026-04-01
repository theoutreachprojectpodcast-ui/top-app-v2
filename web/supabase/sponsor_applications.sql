create table if not exists public.sponsor_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  company_name text not null,
  company_website text,
  company_type text,
  city text,
  state text,
  company_description text,
  contact_role text,
  sponsor_family text not null,
  sponsor_tier_id text,
  sponsor_tier_name text not null,
  sponsor_tier_amount integer not null,
  sponsor_interest_notes text,
  audience_goals text,
  highlights_requested text,
  placements_requested text[] default '{}',
  activation_requests text,
  assets_ready text,
  brand_links text,
  additional_notes text,
  agreed_to_terms boolean not null default false,
  agreed_demo_payment boolean not null default false,
  payment_status text not null default 'unpaid',
  payment_demo_status text not null default 'unpaid',
  application_status text not null default 'draft',
  internal_notes text
);

create index if not exists sponsor_applications_created_at_idx
  on public.sponsor_applications (created_at desc);

create index if not exists sponsor_applications_status_idx
  on public.sponsor_applications (application_status);

