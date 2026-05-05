-- tOP v0.6: Rope Solutions foundational sponsor card finalization.
-- Safe/idempotent update for QA/prod-style data.
-- Social URLs verified from https://www.ropesolutions.com/ (footer); no YouTube link on site at time of update.

begin;

alter table if exists public.sponsors_catalog
  add column if not exists sponsor_category text;

alter table if exists public.sponsors_catalog
  add column if not exists mission_partner boolean not null default false;

update public.sponsors_catalog
set
  name = 'Rope Solutions',
  sponsor_type = 'foundational_sponsor',
  sponsor_category = 'Training & Readiness',
  short_description = 'Mission partner',
  long_description =
    'Rope Solutions delivers elite rope access, rescue systems, and technical training for high-consequence operational teams. Their work supports professionals who need precision, safety, and confidence in unforgiving environments.'
    || E'\n\n'
    || 'From vertical mobility to complex rescue scenarios, Rope Solutions equips teams with the systems and skills needed to operate when conditions are at their worst.',
  tagline = 'Trusted access. Proven under pressure. Built for teams that don''t get second chances.',
  website_url = 'https://www.ropesolutions.com/',
  background_image_url = coalesce(nullif(trim(background_image_url), ''), '/sponsors/featured-bg-rope-solutions.png'),
  logo_url = null,
  logo_status = null,
  logo_review_status = null,
  logo_notes = null,
  linkedin_url = 'https://www.linkedin.com/company/rope-solutions-llc/',
  instagram_url = 'https://www.instagram.com/ropesolutionsofficial/',
  facebook_url = 'https://www.facebook.com/ROPESolutionsLLC',
  youtube_url = null,
  sponsor_scope = 'app',
  sponsor_status = 'active',
  featured = true,
  mission_partner = true,
  is_active = true,
  display_order = case when coalesce(display_order, 0) = 0 then 8 else display_order end,
  warm_variant = coalesce(nullif(trim(warm_variant), ''), 'gold'),
  updated_at = now()
where slug = 'rope-solutions';

commit;
