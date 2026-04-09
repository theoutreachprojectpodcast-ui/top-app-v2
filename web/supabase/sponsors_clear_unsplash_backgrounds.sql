-- Optional: remove legacy generic Unsplash backgrounds so cards fall back to warm-tone CSS
-- or to values repopulated by POST /api/sponsors/enrich (Open Graph image → background_image_url).
-- Review in Supabase SQL editor before running in production.

-- update public.sponsors_catalog
-- set background_image_url = null
-- where background_image_url ilike '%images.unsplash.com%';
