# Homepage Design System (tOP v0.6)

## Visual Intent
- Keep the existing mobile-first navigation stack and routing flow.
- Raise emotional tone with cinematic backgrounds, stronger overlays, and premium contrast.
- Preserve brand identity with Outreach Project green, rounded cards, and readable typography.

## Hero Treatment
- Hero uses a cinematic environmental background with strengthened contrast and saturation.
- Add layered scrim for top fade and lower readability coverage.
- Welcome CTA card uses a green glassmorphism gradient with soft blur and elevated shadow.
- Primary CTA label for signed-out users: `Join — activate membership`.

## Feature Card System
- Structure remains unchanged: Sponsors card + Trusted/Community/Podcasts triplet.
- Each card now has:
  - image background (`--welcome-card-image`)
  - dark readability overlay gradients
  - high-contrast icon capsule and text shadow
  - subtle lift-on-hover interaction
- Typography hierarchy:
  - title uses bold display weight
  - supporting line remains concise and legible over bright backgrounds

## Nonprofit Directory Integration
- Directory container now uses a soft blended gradient instead of flat white.
- `Quick Category Focus` is collapsible (`details/summary`) to reduce visual noise.
- Category chips retain service-color mapping with cleaner elevation and borders.

## Bottom Navigation Polish
- Functionality and location are unchanged.
- Added premium shell treatment:
  - soft glass/gradient background
  - rounded dock with border and shadow
  - refined active-state gradient and emphasis
- Mobile keeps horizontal scrolling behavior and safe-area support.

## Responsive Notes
- Hero and action card heights scale at mobile breakpoints.
- Feature cards maintain one-column stack on narrow screens.
- Bottom nav remains touch-friendly with no routing/interaction changes.
- Overlay/padding tuned to avoid clipping, overflow, or unreadable text.
