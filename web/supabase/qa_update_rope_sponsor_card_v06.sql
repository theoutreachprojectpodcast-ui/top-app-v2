-- tOP v0.6: Rope Solutions foundational sponsor card finalization.
-- Safe/idempotent update for QA/prod-style data.

begin;

alter table if exists public.sponsors_catalog
  add column if not exists sponsor_category text;

update public.sponsors_catalog
set
  name = 'Rope Solutions',
  sponsor_type = 'foundational_sponsor',
  sponsor_category = 'Training & Readiness',
  short_description = 'Trusted access. Proven under pressure. Built for teams that don’t get second chances.',
  long_description = 'Rope Solutions delivers elite rope access, rescue systems, and technical training for high-consequence operational teams. Their work supports professionals who need precision, safety, and confidence in unforgiving environments. From vertical mobility to complex rescue scenarios, Rope Solutions equips teams with the systems and skills needed to operate when conditions are at their worst.',
  tagline = 'Trusted access. Proven under pressure. Built for teams that don’t get second chances.',
  website_url = 'https://www.ropesolutions.com/',
  linkedin_url = 'https://www.linkedin.com/company/rope-solutions-llc/',
  instagram_url = 'https://www.instagram.com/ropesolutionsofficial/',
  facebook_url = null,
  youtube_url = null,
  sponsor_scope = 'app',
  featured = true,
  is_active = true,
  display_order = coalesce(nullif(display_order, 0), 10),
  updated_at = now()
where slug = 'rope-solutions';

commit;
