-- Sponsor applications table for demo payment flow + future billing integration.
create table if not exists public.sponsor_applications (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  company_name text not null,
  company_website text,
  company_type text not null,
  city text not null,
  state text not null,
  company_description text not null,
  contact_role text not null,
  sponsor_family text not null,
  sponsor_tier_id text,
  sponsor_tier_name text not null,
  sponsor_tier_amount numeric not null,
  sponsor_interest_notes text,
  audience_goals text,
  highlights_requested text,
  placements_requested jsonb default '[]'::jsonb,
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

create index if not exists sponsor_applications_application_status_idx
  on public.sponsor_applications (application_status);
