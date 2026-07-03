-- tOP v0.7: Sponsor card single badge + public display fields + verified social links.
-- Safe/idempotent: ADD COLUMN IF NOT EXISTS + targeted UPDATEs by slug.
-- Run after sponsors_catalog + mission_partner / social_links extensions exist.

begin;

alter table if exists public.sponsors_catalog
  add column if not exists primary_display_tag text;

alter table if exists public.sponsors_catalog
  add column if not exists display_name text;

alter table if exists public.sponsors_catalog
  add column if not exists internal_alias text;

alter table if exists public.sponsors_catalog
  add column if not exists veteran_owned boolean not null default false;

-- ROPE Solutions — one public badge + tighten short line (avoid duplicate “mission” chip tone).
update public.sponsors_catalog
set
  primary_display_tag = 'Foundational Sponsor',
  veteran_owned = true,
  short_description = 'Training & readiness',
  sponsor_scope = 'app',
  sponsor_type = 'foundational_sponsor',
  is_active = true,
  updated_at = now()
where slug = 'rope-solutions';

-- Rucking Realty Group — app roster + verified socials (public profiles, May 2026).
update public.sponsors_catalog
set
  sponsor_scope = 'app',
  sponsor_type = 'foundational_sponsor',
  primary_display_tag = 'Foundational Sponsor',
  website_url = 'https://ruckingrealtygroup.com/',
  instagram_url = 'https://www.instagram.com/rucking.realty.groupllc/',
  facebook_url = 'https://www.facebook.com/61579340832737',
  sponsor_category = 'Real estate',
  short_description = 'San Antonio real estate',
  tagline =
    'Mike and Natalie Evans — husband-and-wife Realtors helping clients buy and sell in San Antonio with integrity.',
  long_description =
    $RR$
Rucking Realty Group is led by Mike and Natalie Evans — a husband-and-wife real estate team rooted in service and family. Mike is a United States Marine Corps veteran; together they help clients buy, sell, rent, and invest with honesty, integrity, and steady communication. They proudly serve the greater San Antonio area and communities across Texas, with a special heart for military families and those navigating life transitions.
$RR$,
  social_links = jsonb_strip_nulls(
    jsonb_build_object(
      'instagram', 'https://www.instagram.com/rucking.realty.groupllc/',
      'facebook', 'https://www.facebook.com/61579340832737'
    )
  ),
  is_active = true,
  updated_at = now()
where slug = 'rucking-realty-group';

-- Eduardo Pico Designs — app roster + verified socials.
update public.sponsors_catalog
set
  sponsor_scope = 'app',
  sponsor_type = 'foundational_sponsor',
  primary_display_tag = 'Foundational Sponsor',
  website_url = 'https://eduardopicodesigns.com/',
  instagram_url = 'https://www.instagram.com/eduardopicodesigns/',
  facebook_url = 'https://www.facebook.com/EduardoPicoDesigns/',
  sponsor_category = 'Design & fabrication',
  short_description = 'Veteran-owned laser & CNC studio',
  tagline =
    'Custom laser and CNC work — home décor, signs, tumblers, military awards, and bespoke builds from a veteran-owned Texas studio.',
  long_description =
    $EP$
Eduardo Pico Designs is a veteran-owned Texas studio specializing in laser engraving and CNC work — from drinkware and door hangers to custom awards, military recognition pieces, and business-branded products. Each piece is built with craftsmanship, clarity, and pride, supporting mission-driven causes and local nonprofit partners across the community.
$EP$,
  veteran_owned = true,
  social_links = jsonb_strip_nulls(
    jsonb_build_object(
      'instagram', 'https://www.instagram.com/eduardopicodesigns/',
      'facebook', 'https://www.facebook.com/EduardoPicoDesigns/'
    )
  ),
  is_active = true,
  updated_at = now()
where slug = 'eduardo-pico-designs';

-- War's End (slug unchanged: wars-end-merch) — public title + Instagram; shop URL kept as primary site.
update public.sponsors_catalog
set
  name = $jw$War's End$jw$,
  display_name = $jw$War's End$jw$,
  internal_alias =
    $IA$
Legacy / internal listing titles may have referenced “Warzone Veteran” or “War's End Veteran Owned and Operated”. Public-facing name: War's End.
$IA$,
  sponsor_scope = 'app',
  sponsor_type = 'foundational_sponsor',
  primary_display_tag = 'Foundational Sponsor',
  website_url = coalesce(nullif(trim(website_url), ''), 'https://www.warsendmerch.com/'),
  instagram_url = 'https://www.instagram.com/wars__end/',
  short_description = 'Veteran-owned woodworking & flags',
  tagline =
    'Handmade American flags and woodworking from a veteran-owned shop in Texas — honoring service through craft.',
  long_description =
    $WE$
War's End is veteran-owned, creating handmade American flags and custom woodworking from Texas. Each piece is built with care to honor service, recovery, and resilience, with proceeds supporting veteran-focused nonprofit partners.
$WE$,
  veteran_owned = true,
  social_links = jsonb_strip_nulls(jsonb_build_object('instagram', 'https://www.instagram.com/wars__end/')),
  is_active = true,
  updated_at = now()
where slug = 'wars-end-merch';

-- Gameday Men's Health — local Stone Oak clinic (San Antonio) vs national brand-only URLs.
update public.sponsors_catalog
set
  sponsor_scope = 'app',
  sponsor_type = 'foundational_sponsor',
  primary_display_tag = 'Foundational Sponsor',
  website_url = 'https://gamedaymenshealth.com/stone-oak/',
  instagram_url = 'https://www.instagram.com/gameday_stone_oak/',
  short_description = 'Men''s health — Stone Oak, San Antonio',
  tagline =
    'Same-day visits, on-site labs, and physician-guided men''s health care at the Stone Oak clinic — part of the national Gameday network.',
  long_description =
    $GD$
Gameday Men's Health Stone Oak delivers fast, decisive men's health care in San Antonio: same-day appointments, on-site lab testing with rapid turnaround, and physician-guided plans spanning testosterone therapy, weight management, sexual wellness, hair loss, and recovery support — in a private, sports-lounge-style clinic.
$GD$,
  social_links = jsonb_strip_nulls(
    jsonb_build_object(
      'instagram', 'https://www.instagram.com/gameday_stone_oak/'
    )
  ),
  is_active = true,
  updated_at = now()
where slug = 'gameday-mens-health';

-- Retire duplicate catalog slug if present (keeps a single public “War's End” style row).
update public.sponsors_catalog
set
  is_active = false,
  sponsor_scope = 'app',
  admin_notes = 'Deactivated v0.7: duplicate / legacy roster entry (use wars-end-merch / War''s End).',
  updated_at = now()
where slug = 'the-veterans-veteran';

commit;
