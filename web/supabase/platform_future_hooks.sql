-- Optional future-facing columns (run manually when ready; app works without them).
-- Keeps tORP domains separable for admin / CRM / billing / media.

-- User profiles: membership + tagline + CRM correlation
-- alter table public.top_app_user_profiles
--   add column if not exists membership_tier text default 'support'
--     check (membership_tier in ('none', 'support', 'sponsor', 'member')),
--   add column if not exists tagline text,
--   add column if not exists crm_contact_id text,
--   add column if not exists payment_customer_id text;

-- Community posts: moderation + media storage
-- alter table public.community_posts
--   add column if not exists moderation_notes text,
--   add column if not exists assigned_moderator_id text,
--   add column if not exists cover_image_storage_path text,
--   add column if not exists cover_image_public_url text,
--   add column if not exists share_count bigint default 0;

-- Trusted Resource applications: CRM + payment correlation
-- alter table public.trusted_resource_applications
--   add column if not exists crm_lead_id text,
--   add column if not exists payment_intent_id text,
--   add column if not exists payment_provider text;

-- Sponsors (if you add a sponsors table later)
-- suggested fields: category_key, warm_variant, logo_url, hero_image_url,
--   website_url, linkedin_url, instagram_url, facebook_url, x_url
