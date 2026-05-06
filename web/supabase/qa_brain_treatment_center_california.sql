-- Brain Treatment Center: Northern Virginia → California (Danville). Run in QA/prod after deploy.
-- Migrates legacy slug and aligns copy + website with https://braincaredanville.com/

update public.sponsors_catalog
set
  slug = 'brain-treatment-center-california',
  name = 'Brain Treatment Center — California',
  website_url = 'https://braincaredanville.com/',
  logo_url = 'https://braincaredanville.com/wp-content/uploads/2023/10/brain-treatment-center-white.png',
  tagline = 'MeRT and integrative care in Danville — for veterans, first responders, autism families, and complex brain health needs.',
  long_description =
    'Brain Treatment Center Danville delivers integrative brain and functional health care — including MeRT (Magnetic e-Resonance Therapy) and personalized, measurement-guided treatment plans. The team serves the San Francisco Bay Area and Northern California from Danville, supporting PTSD, TBI, autism spectrum, depression, anxiety, cognitive recovery, and sports-related brain health with a compassionate, evidence-informed approach.',
  instagram_url = null,
  logo_status = coalesce(nullif(trim(logo_status), ''), 'curated'),
  updated_at = now()
where slug = 'brain-treatment-center-nova';

-- If seed already used the new slug, still refresh fields:
update public.sponsors_catalog
set
  name = 'Brain Treatment Center — California',
  website_url = 'https://braincaredanville.com/',
  logo_url = 'https://braincaredanville.com/wp-content/uploads/2023/10/brain-treatment-center-white.png',
  tagline = 'MeRT and integrative care in Danville — for veterans, first responders, autism families, and complex brain health needs.',
  long_description =
    'Brain Treatment Center Danville delivers integrative brain and functional health care — including MeRT (Magnetic e-Resonance Therapy) and personalized, measurement-guided treatment plans. The team serves the San Francisco Bay Area and Northern California from Danville, supporting PTSD, TBI, autism spectrum, depression, anxiety, cognitive recovery, and sports-related brain health with a compassionate, evidence-informed approach.',
  instagram_url = null,
  updated_at = now()
where slug = 'brain-treatment-center-california';
