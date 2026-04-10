alter table public.sponsor_applications
  add column if not exists stripe_checkout_session_id text,
  add column if not exists applicant_workos_user_id text;

create index if not exists sponsor_applications_stripe_session_idx
  on public.sponsor_applications (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

comment on column public.sponsor_applications.stripe_checkout_session_id is 'Stripe Checkout Session id for podcast paid flow; verified server-side on submit.';
comment on column public.sponsor_applications.applicant_workos_user_id is 'WorkOS user id when submitter was signed in; optional for anonymous applicants.';
