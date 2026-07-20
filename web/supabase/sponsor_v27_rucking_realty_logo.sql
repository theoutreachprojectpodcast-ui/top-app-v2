-- Rucking Realty Group — official badge logo (2026 brand mark).
update public.sponsors_catalog
set
  logo_url = '/sponsors/rucking-realty-group-logo.png?v=3',
  logo_review_status = 'approved',
  logo_status = 'approved',
  updated_at = now()
where slug = 'rucking-realty-group';
