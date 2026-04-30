# Trusted Resources Management

Trusted resources are managed in `/admin/trusted`.

## Data model

- Primary table: `public.trusted_resources`
- Application intake: `public.trusted_resource_applications`
- Added admin fields in v0.5 patch:
  - `status`
  - `contact_email`
  - `contact_phone`
  - `admin_notes`

## Public behavior

Public trusted resource listings continue to read catalog API data and render the existing trusted card format.
