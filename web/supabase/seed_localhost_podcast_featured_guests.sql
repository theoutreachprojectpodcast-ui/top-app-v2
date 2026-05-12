-- Optional: seed active voice cards for localhost / dev DBs (idempotent on slug).
-- Requires podcast_v06_production.sql (quote, active, display_order, organization, role_title).

begin;

insert into public.podcast_guests (
  slug,
  name,
  title,
  organization,
  role_title,
  bio,
  quote,
  avatar_url,
  active,
  display_order,
  featured,
  upcoming
)
values
  (
    'localhost-demo-voice-rivera',
    'Alex Rivera',
    'Army veteran · nonprofit founder',
    'Outreach Demo Veterans Initiative',
    'Founder',
    'Demo seed row for layout only in local databases.',
    'Service does not end when you take off the uniform — it changes shape.',
    '',
    true,
    10,
    false,
    false
  ),
  (
    'localhost-demo-voice-lee',
    'Jordan Lee',
    'First responder · peer support lead',
    'Demo Peer Support Collective',
    'Lead',
    'Demo seed row for layout only in local databases.',
    'We built this network so no one has to white-knuckle the hard days alone.',
    '',
    true,
    20,
    false,
    false
  ),
  (
    'localhost-demo-voice-ortiz',
    'Sam Ortiz',
    'Community advocate',
    'Demo Community Partners',
    'Advocate',
    'Demo seed row for layout only in local databases.',
    'Clarity under pressure is a skill — and it is one we can teach each other.',
    '',
    true,
    30,
    false,
    false
  )
on conflict (slug) do update set
  name = excluded.name,
  title = excluded.title,
  organization = excluded.organization,
  role_title = excluded.role_title,
  bio = excluded.bio,
  quote = excluded.quote,
  active = excluded.active,
  display_order = excluded.display_order,
  updated_at = now();

commit;
