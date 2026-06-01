# Podcast Sponsors

## Location

Podcast sponsors are rendered on:

- `/podcasts`

Section component:

- `web/src/features/podcasts/components/PodcastSponsorsSection.jsx`

## Data contract

Podcast sponsor rows are loaded from:

- `listSponsorsCatalog(..., { sponsorScope: "podcast" })`

Backend filtering:

- `sponsor_scope = podcast` or `sponsor_type = podcast_sponsor`
- `is_active = true`

## UI system

Podcast section reuses the sponsor card system:

- `FeaturedSponsorCard`

and applies podcast page visual identity through podcast styles (`blue/orange` themed shell).

Layout behavior:

- desktop/tablet: 2-column grid
- mobile: 1-column grid

Styles:

- `web/src/features/podcasts/styles/podcasts.css`
- `.podcastSponsorsCardGrid`

## Admin control

Admin can control podcast sponsor visibility and ordering via sponsor fields:

- `podcast_sponsor`
- `sponsor_scope`
- `is_active`
- `display_order`
- content/media/link fields
