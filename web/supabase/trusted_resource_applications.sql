-- Trusted Resource application intake table (demo + future-ready review pipeline)
create table if not exists public.trusted_resource_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_path text not null check (organization_path in ('existing', 'new')),
  organization_id text null,
  organization_name text not null,
  applicant_first_name text not null,
  applicant_last_name text not null,
  applicant_email text not null,
  applicant_phone text null,
  website text null,
  city text not null,
  state text not null,
  nonprofit_type text not null,
  why_good_fit text not null,
  who_you_serve text not null,
  services_offered text not null,
  veteran_support_experience text null,
  first_responder_support_experience text null,
  community_impact text null,
  why_join_trusted_resources text not null,
  references_or_links text null,
  agreed_to_values boolean not null default false,
  agreed_info_accuracy boolean not null default false,
  application_fee_status text not null default 'unpaid',
  payment_demo_status text not null default 'unpaid',
  review_status text not null default 'submitted',
  notes_internal text null
);

create index if not exists idx_trusted_resource_applications_created_at on public.trusted_resource_applications(created_at desc);
create index if not exists idx_trusted_resource_applications_review_status on public.trusted_resource_applications(review_status);
