-- tOP v1.0 — Public /sponsors hub: refreshed short lines, taglines, long blurbs, and verified primary websites.
-- Idempotent UPDATEs by slug. Run after sponsors_catalog exists. Does not change display_order or logos.

begin;

update public.sponsors_catalog
set
  sponsor_category = 'Outdoor retail',
  short_description = 'Outdoor gear & expedition retail',
  tagline =
    'Curated gear and global outdoor brands for people who train, travel, and serve in demanding environments.',
  long_description =
    $apex$
Apex Global Outdoors is building a mission-aligned outdoor retail experience—pairing trusted equipment with education on preparedness, fieldcraft, and responsible land use. The team partners with The Outreach Project to expand outdoor access for veterans, first responders, and families who rely on dependable kit when conditions turn serious. Official site: apexglobaloutdoors.com.
$apex$,
  website_url = coalesce(nullif(trim(website_url), ''), 'https://apexglobaloutdoors.com/'),
  updated_at = now()
where slug = 'apex-global-outdoors';

update public.sponsors_catalog
set
  short_description = 'Men''s health clinics',
  tagline =
    'Stone Oak, San Antonio — same-day visits, on-site labs, and physician-guided men''s health care in a private clinic.',
  long_description =
    $gd$
Gameday Men's Health Stone Oak is the San Antonio clinic in the national Gameday network. Patients get same-day scheduling, on-site labs with rapid turnaround, and physician-guided treatment plans across testosterone therapy, weight management, sexual wellness, hair restoration, and recovery support—delivered in a discreet, sports-lounge-style setting built for busy professionals and veterans juggling shift work and family life.
$gd$,
  website_url = coalesce(nullif(trim(website_url), ''), 'https://gamedaymenshealth.com/stone-oak/'),
  updated_at = now()
where slug = 'gameday-mens-health';

update public.sponsors_catalog
set
  sponsor_category = 'Training & readiness',
  short_description = 'Rope access, rescue & training',
  tagline = 'Trusted access. Proven under pressure. Built for teams that don''t get second chances.',
  long_description =
    $rope$
Rope Solutions delivers industrial rope access, confined-space rescue, and technical training for teams that work at height and in high-consequence environments. Veteran-led and service-disabled veteran-owned, the company combines field-proven systems with leadership development so crews can plan, communicate, and execute safely when there is no room for error.

From vertical mobility to complex rescue scenarios, Rope Solutions equips public safety, industrial, and defense-adjacent organizations with the skills and hardware to operate in unforgiving conditions.
$rope$,
  website_url = coalesce(nullif(trim(website_url), ''), 'https://www.ropesolutions.com/'),
  updated_at = now()
where slug = 'rope-solutions';

update public.sponsors_catalog
set
  is_active = true,
  sponsor_scope = 'app',
  sponsor_type = 'foundational_sponsor',
  sponsor_display_group = 'foundational',
  primary_display_tag = 'Foundational Sponsor',
  name = 'The Veterans Veteran',
  display_name = 'The Veterans Veteran',
  sponsor_category = 'Veteran nonprofit & craft',
  short_description = 'Handmade American flags & custom woodworking',
  tagline =
    'Veteran-owned flags and custom woodworking from Texas—each piece honors service and recovery while proceeds support veteran-serving nonprofits.',
  long_description =
    $tvv$
The Veterans Veteran is a veteran-owned organization in Texas that hand-builds American flags and custom woodworking with patience, precision, and respect for the uniform. Work is crafted to honor service, recovery, and resilience. Proceeds and collaborations fund veteran-focused nonprofits so craftsmanship in the shop translates into concrete help for people navigating transition, health care, employment, and community reintegration.
$tvv$,
  website_url = coalesce(nullif(trim(website_url), ''), 'https://www.warsendmerch.com/'),
  instagram_url = coalesce(nullif(trim(instagram_url), ''), 'https://www.instagram.com/wars__end/'),
  social_links = coalesce(
    social_links,
    '{}'::jsonb
  ) || jsonb_strip_nulls(jsonb_build_object('instagram', 'https://www.instagram.com/wars__end/')),
  updated_at = now()
where slug = 'the-veterans-veteran';

update public.sponsors_catalog
set
  sponsor_category = 'Real estate',
  short_description = 'Texas residential real estate',
  tagline =
    'Mike & Natalie Evans — Marine-led, family-first Realtors helping clients buy, sell, rent, and invest across Texas.',
  long_description =
    $rr$
Rucking Realty Group is led by Mike and Natalie Evans, a husband-and-wife team based near San Antonio. Mike served as a United States Marine Corps infantry Marine (2005–2009) and carries that discipline into every transaction; Natalie brings a decade of HR leadership and a calm, people-first style that keeps complex deals on track. Together they serve Military City USA and communities statewide with honest pricing guidance, proactive communication, and extra care for military families, first-time buyers, and folks navigating life transitions.
$rr$,
  website_url = coalesce(nullif(trim(website_url), ''), 'https://ruckingrealtygroup.com/'),
  updated_at = now()
where slug = 'rucking-realty-group';

update public.sponsors_catalog
set
  sponsor_category = 'Food & beverage',
  short_description = 'Veteran-owned coffee roaster',
  tagline =
    'Small-batch roasts, wholesale programs, and retail for crews who live on coffee between missions.',
  long_description =
    $isc$
Iron Soldiers Coffee Company is a veteran-owned specialty roaster focused on bold, consistent profiles for shift workers, athletes, and community fundraisers. Beans are roasted in small batches with transparent sourcing so wholesale partners, nonprofits, and local retailers can serve cups that taste as intentional as the mission behind the brand.
$isc$,
  website_url = coalesce(nullif(trim(website_url), ''), 'https://www.ironsoldierscoffee.com/'),
  updated_at = now()
where slug = 'iron-soldiers-coffee-company';

update public.sponsors_catalog
set
  sponsor_category = 'Veteran services',
  short_description = 'Veteran benefits & resource navigation',
  tagline =
    'Human navigation that sequences VA benefits, healthcare, employment, and community programs without the runaround.',
  long_description =
    $vn$
Vet Nav Services pairs veterans and military families with navigators who speak the language of DD-214s, disability claims, vocational rehab, and local aid networks. The focus is practical sequencing—what to file first, which clinic or VSO can help, and how to avoid dead ends—so people spend less time searching portals and more time moving toward stable housing, healthcare, and work.
$vn$,
  updated_at = now()
where slug = 'vetnav-services';

update public.sponsors_catalog
set
  sponsor_category = 'Design & fabrication',
  short_description = 'Laser engraving & CNC fabrication',
  tagline =
    'Veteran-owned Texas studio for awards, signage, drinkware, and bespoke shop projects with museum-grade finishing.',
  long_description =
    $ep$
Eduardo Pico Designs is a veteran-owned laser and CNC studio outside San Antonio, Texas. The team produces everything from personalized tumblers and ranch-style door hangers to unit coins, nonprofit gala awards, and full custom shop fit-outs. Expect collaborative proofs, disciplined timelines, and finishes that hold up to Texas heat, humidity, and the scrutiny of clients who care about detail.
$ep$,
  website_url = coalesce(nullif(trim(website_url), ''), 'https://eduardopicodesigns.com/'),
  updated_at = now()
where slug = 'eduardo-pico-designs';

update public.sponsors_catalog
set
  sponsor_category = 'Land management',
  veteran_owned = true,
  short_description = 'Forestry mulching & land clearing',
  tagline =
    'Charleston, SC–based crew for forestry mulching, brush clearing, storm cleanup, and large-lot mowing with daily field reporting.',
  long_description =
    $gg$
Green Gorilla Land Management is a veteran-owned land services contractor serving Charleston, the South Carolina Lowcountry, and nearby coastal counties. Services include forestry mulching, selective clearing, bush hogging, storm debris removal, and pre-sale property cleanup. Crews document progress with photos, stick to agreed scopes, and prioritize ecological balance so residential, commercial, and nonprofit partners can put land back to work safely.
$gg$,
  website_url = coalesce(nullif(trim(website_url), ''), 'https://gglandmanagement.com/'),
  updated_at = now()
where slug = 'green-gorilla-land-management';

commit;
