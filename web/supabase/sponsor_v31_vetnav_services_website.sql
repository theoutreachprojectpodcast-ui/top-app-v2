-- Vet Nav Services — verified public website (About page).
update public.sponsors_catalog
set
  website_url = 'https://www.vetnavservices.com/about',
  cta_url = 'https://www.vetnavservices.com/about',
  cta_label = 'Visit Website',
  updated_at = now()
where slug = 'vetnav-services';
