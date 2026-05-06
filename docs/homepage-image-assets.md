# Homepage Image Assets (tOP v0.6)

## Asset Mapping

All assets are stored in `web/public/home/`.

- Hero background: `home-trusted-mountain.png`
- Sponsors card background: `home-sponsors-city.png`
- Trusted Resources card background: `home-trusted-mountain.png`
- Community card background: `home-community-group.png`
- Podcasts card background: `home-podcast-mic.png`

## Source Images
- `IMG_6800...png` -> `home-sponsors-city.png`
- `37B1674E...png` -> `home-trusted-mountain.png`
- `IMG_6802...png` -> `home-community-group.png`
- `IMG_6803...png` -> `home-podcast-mic.png`

## Overlay Rules
- Use dark gradient overlays on all feature cards for text contrast.
- Add a subtle accent wash tied to brand green for visual consistency.
- Preserve image visibility by avoiding full opaque overlays.
- Keep icons and labels above overlays with explicit layering (`z-index`).

## Responsive Behavior
- Backgrounds render with `cover` and centered positioning for cinematic crop.
- Cards keep rounded clipping and maintain readable text at all breakpoints.
- Hero scales with min-height clamps to avoid layout shift.
- Mobile maintains stacked cards and safe-area bottom nav spacing.

## Environment Safety
- Assets are committed under `web/public/home/` (no local-only absolute paths).
- Paths are referenced with web root URLs (`/home/...`) for localhost, QA, and production parity.
