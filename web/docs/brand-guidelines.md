# The Outreach Project Brand Guidelines

## Nonprofit Category Color System

The product remains dark, calm, and premium. Category colors are a controlled semantic layer used for nonprofit scanability.

### Category Tokens

- `recreationSports` - Recreation & Sports - `var(--np-recreationSports)`
- `artsCulture` - Arts, Culture & Humanities - `var(--np-artsCulture)`
- `publicBenefit` - Public & Societal Benefit - `var(--np-publicBenefit)`
- `religionSpirituality` - Religion & Spirituality - `var(--np-religionSpirituality)`
- `healthWellness` - Health & Wellness - `var(--np-healthWellness)`
- `education` - Education - `var(--np-education)`
- `humanServices` - Human Services - `var(--np-humanServices)`
- `veteransMilitary` - Veterans & Military Support - `var(--np-veteransMilitary)`
- `firstRespondersSafety` - First Responders / Safety - `var(--np-firstRespondersSafety)`
- `communityDevelopment` - Community Development - `var(--np-communityDevelopment)`
- `environmentAnimals` - Environment & Animals - `var(--np-environmentAnimals)`
- `youthDevelopment` - Youth Development - `var(--np-youthDevelopment)`
- `crisisEmergency` - Crisis Support / Emergency Services - `var(--np-crisisEmergency)`
- `advocacyPolicyRights` - Advocacy / Policy / Rights - `var(--np-advocacyPolicyRights)`
- `unknownGeneral` - Unknown / General - `var(--np-unknownGeneral)`

### Usage Rules

- Use category colors primarily for nonprofit icons and category indicators.
- Keep backgrounds neutral (charcoal/graphite); category colors should not dominate surfaces.
- Use subtle tints for icon badge glow/background only.
- Keep text readable against dark surfaces with strong contrast.

### Avoid

- Full-card fills with category colors.
- Large saturated color blocks.
- Using category colors for core navigation chrome or unrelated components.

### Current Implementation

- Category metadata is centralized in `src/features/nonprofits/mappers/categoryMapper.js`.
- Theme tokens are defined in `src/styles/brand-dark.css`.
- Nonprofit card icon and category label consume the category tokens.
