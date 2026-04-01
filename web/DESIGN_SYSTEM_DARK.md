# The Outreach Project Dark Mode Brand System

## Step 1 - Exact Color Palette (reference-anchored)

These values are the enforced production palette.

### Background Core

- `bg-deep-primary` = `#0B1F24`
  - **Image role:** deepest matte field behind the mark.
  - **Usage:** base page background and deepest nav bands.
- `bg-deep-secondary` = `#102A30`
  - **Image role:** lifted dark zones around illuminated center.
  - **Usage:** top bars, modal body base, section gradients.
- `bg-surface` = `#15333A`
  - **Image role:** raised layer tone for depth separation.
  - **Usage:** cards, inputs, interactive containers.

### Gold / Metallic System

- `gold-primary` = `#C58B2A`
  - **Image role:** primary metallic letter body.
  - **Usage:** primary brand emphasis and core CTA fill.
- `gold-highlight` = `#E0A843`
  - **Image role:** reflective edge and high-light stroke.
  - **Usage:** top gradient edge of premium buttons and logo text accents.
- `gold-shadow` = `#8A5E1A`
  - **Image role:** recessed bevel/shadow metal depth.
  - **Usage:** border/depth line for gold elements only.

### Cyan / Neon System

- `cyan-primary` = `#2ED3E6`
  - **Image role:** active glow accent line.
  - **Usage:** interaction glow and active emphasis.
- `cyan-bright` = `#6FE7F5`
  - **Image role:** brightest electric edge.
  - **Usage:** focus rings, selected nav text, critical hover states.
- `cyan-muted` = `#1AA3B5`
  - **Image role:** lower-intensity cyan contour.
  - **Usage:** secondary button borders and subtle action framing.

### Neutrals

- `text-primary` = `#E6F1F2`
  - **Image role:** high-contrast readable foreground.
  - **Usage:** primary body/headline text.
- `text-secondary` = `#9FB4B8`
  - **Image role:** reduced-contrast support copy.
  - **Usage:** metadata, helper text, annotations.
- `border-subtle` = `#1F3A40`
  - **Image role:** structural separators in dark surfaces.
  - **Usage:** card/input/nav borders.

## Step 2 - CSS Variable System

Implemented in `src/styles/brand-dark.css`.

```css
:root {
  --color-bg-primary: #0b1f24;
  --color-bg-secondary: #102a30;
  --color-surface: #15333a;

  --color-gold-primary: #c58b2a;
  --color-gold-highlight: #e0a843;
  --color-gold-shadow: #8a5e1a;

  --color-cyan-primary: #2ed3e6;
  --color-cyan-bright: #6fe7f5;
  --color-cyan-muted: #1aa3b5;

  --color-text-primary: #e6f1f2;
  --color-text-secondary: #9fb4b8;
  --color-border: #1f3a40;

  --glow-cyan: 0 0 12px #2ed3e6, 0 0 24px rgba(46, 211, 230, 0.25);
  --glow-gold: 0 0 10px rgba(224, 168, 67, 0.35);
}
```

## Step 3 - Brand Foundation

- **Brand traits**
  - Strong
  - Trustworthy
  - Disciplined
  - Mission-first
  - Supportive
- **UX tone**
  - Direct
  - Respectful
  - Structured
  - Non-overwhelming

## Step 4 - Typography System

- **Heading font:** Rajdhani (bold, slightly condensed)
- **Body font:** Inter (clean readability)
- **Stack**
  - Headings: `"Rajdhani", "Inter", "Segoe UI", sans-serif`
  - Body: `"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Scale**
  - H1: `40/44`, 700
  - H2: `32/38`, 700
  - H3: `24/30`, 700
  - H4: `20/26`, 700
  - Body L: `18/28`, 500
  - Body: `16/24`, 400
  - Body S: `14/20`, 500
  - Label: `12/16`, 600

## Step 5 - Depth + Glow System

- Cyan glow is reserved for **interaction state only**.
- Gold is reserved for **identity and top-priority CTA**.
- Shadows are crisp and directional, not diffuse haze.

```css
.btn-cyan:hover { box-shadow: var(--glow-cyan); }
.btn-gold { box-shadow: var(--glow-gold); }
:focus-visible {
  outline: 2px solid var(--color-cyan-bright);
  outline-offset: 2px;
  box-shadow: var(--glow-cyan);
}
```

## Step 6 - Component System Rules

- **Buttons**
  - Gold Primary: commitment action (`Search`, `Become a Member`, key submits)
  - Cyan Glow CTA: important non-primary interaction (`Load more`, `Refresh`)
  - Secondary Outline: neutral support actions (`Cancel`, `Back`, `Clear`)
- **Cards**
  - Resource cards use `bg-surface` + `border-subtle` + muted metadata.
  - Trusted org cards add cyan accent state and clear trust badge.
- **Inputs**
  - Dark field, cyan focus ring, high text contrast.
  - Search and filters maintain consistent 44px+ touch area.
- **Nav**
  - Top nav in `bg-deep-secondary`.
  - Bottom nav in same tone with cyan active state and glow.
- **Modals**
  - Overlay dim: `rgba(3,8,10,.72)`.
  - Modal shell uses dark gradient (`bg-deep-secondary` to `bg-deep-primary`).
  - Primary modal action is gold.

## Step 7 - Tailwind Config

Implemented in `tailwind.config.js` with exact palette and glow shadows.

## Step 8 - Global Styles

- Dark mode is default.
- Background uses subtle cyan radial + dark vertical gradient for premium depth.
- Spacing system uses variable steps (`--space-1` to `--space-8`).

## Step 9 - UI Principles

- Cards over dense tables.
- Clear CTA hierarchy (gold > cyan > secondary outline).
- Minimal visual clutter; high signal UI.
- Trust-first visual language and content emphasis.
- Guided, staged flows for high-stress user contexts.

## Step 10 - Mobile Adaptation

- Maintain AA+ contrast in all states.
- Minimum 44px tap targets on actionable controls.
- Single-column stack under tablet breakpoints.
- Strong spacing rhythm for readability under stress.

## Step 11 - Sample Components

Production examples added in:

- `src/components/design-system/SampleComponents.jsx`

Contains:

- Gold primary button
- Resource card
- Search input
- Mission modal

## Step 12 - Integration Instructions

1. Keep `src/styles/brand-dark.css` imported in `src/app/globals.css`.
2. Use design tokens only; do not hardcode off-palette colors.
3. For React components:
   - Prefer CSS variables for shared primitives.
   - Use Tailwind token names where utility classes are preferred.
4. Maintain the same token names across web/mobile wrappers for Capacitor parity.
5. Before adding new color, document derivation in this file and map to existing token intent.
