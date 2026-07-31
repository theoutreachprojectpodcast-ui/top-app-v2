-- QA seed / sample data for IRS nonprofit import review flows.
-- DO NOT run on production unless intentionally seeding demo EINs.
-- Safe to re-run (upsert by EIN).

insert into public.irs_eo_organizations as t (
  ein,
  org_name,
  irs_subsection,
  irs_classification,
  foundation_code,
  city,
  state,
  zip,
  country,
  deductibility_code,
  deductibility_status,
  ruling_date,
  ntee_code,
  category_tags,
  audience_tags,
  serves_veterans,
  serves_first_responders,
  directory_status,
  is_featured,
  is_trusted,
  irs_source_file,
  irs_source_date,
  last_verified_at,
  data_origin
) values
(
  '000000019',
  'QA SAMPLE VFW POST 19',
  '19',
  '1',
  '00',
  'Washington',
  'DC',
  '20001',
  'US',
  '1',
  'Contributions are deductible',
  '1950-01',
  'W30',
  array['veterans','military','nonprofit','irs_exempt'],
  array['veteran','military','family','support'],
  true,
  false,
  'pending_review',
  false,
  false,
  'qa_seed',
  current_date,
  now(),
  'irs_eo_bmf'
),
(
  '000000023',
  'QA SAMPLE APPROVED LEGION POST',
  '19',
  '1',
  '00',
  'Arlington',
  'VA',
  '22201',
  'US',
  '1',
  'Contributions are deductible',
  '1945-06',
  'W30',
  array['veterans','military','nonprofit','irs_exempt'],
  array['veteran','military','family','support'],
  true,
  false,
  'approved',
  false,
  false,
  'qa_seed',
  current_date,
  now(),
  'irs_eo_bmf'
)
on conflict (ein) do update set
  org_name = excluded.org_name,
  directory_status = excluded.directory_status,
  updated_at = now();

-- Mirror approved sample into directory search when the table is writable.
do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'nonprofits_search_app_v1' and c.relkind = 'r'
  ) then
    insert into public.nonprofits_search_app_v1 as d (
      ein, org_name, city, state, zip, ntee_code,
      serves_veterans, serves_first_responders,
      directory_status, is_featured, is_trusted,
      irs_subsection, irs_classification, foundation_code,
      deductibility_code, deductibility_status, ruling_date, country,
      category_tags, audience_tags, irs_source_file, irs_source_date,
      last_verified_at, data_origin
    )
    select
      ein, org_name, city, state, zip, ntee_code,
      serves_veterans, serves_first_responders,
      directory_status, is_featured, is_trusted,
      irs_subsection, irs_classification, foundation_code,
      deductibility_code, deductibility_status, ruling_date, country,
      category_tags, audience_tags, irs_source_file, irs_source_date,
      last_verified_at, data_origin
    from public.irs_eo_organizations
    where ein in ('000000019', '000000023')
    on conflict (ein) do update set
      org_name = excluded.org_name,
      directory_status = excluded.directory_status,
      updated_at = now();
  end if;
exception when others then
  raise notice 'QA directory mirror skipped: %', sqlerrm;
end $$;
