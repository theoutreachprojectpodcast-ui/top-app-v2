-- Proven Ally applications table for demo + future review workflow.
create table if not exists public.proven_ally_applications (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  organization_name text not null,
  applicant_name text,
  applicant_first_name text not null,
  applicant_last_name text not null,
  applicant_email text not null,
  applicant_phone text,
  organization_id text,
  organization_path text not null default 'new',
  website text,
  city text,
  state text,
  nonprofit_type text,
  why_good_fit text,
  who_you_serve text,
  services_offered text,
  veteran_support_experience text,
  first_responder_support_experience text,
  community_impact text,
  why_join_proven_allies text,
  references_or_links text,
  agreed_to_values boolean not null default false,
  agreed_info_accuracy boolean not null default false,
  acknowledged_review_process boolean not null default false,
  application_fee_status text not null default 'unpaid',
  payment_demo_status text not null default 'unpaid',
  review_status text not null default 'draft',
  notes_internal text
);

create index if not exists proven_ally_applications_created_at_idx on public.proven_ally_applications (created_at desc);
create index if not exists proven_ally_applications_review_status_idx on public.proven_ally_applications (review_status);
