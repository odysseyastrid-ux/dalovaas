---
name: Magicstick Clean
description: A one-person cleaning business site in brightened teal and gold, warm and sunlit
colors:
  charcoal: "#1F2937"
  paper: "#FFFFFF"
  cream: "#FDFCF9"
  teal: "#0B5D52"
  teal-light: "#127A6C"
  gold: "#C9A227"
  teal-tint: "#EEF8F6"
  neutral-text: "#6B7280"
  hairline: "#E4E0D4"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"
  xl: "20px"
  pill: "100px"
spacing:
  sm: "16px"
  md: "24px"
  lg: "48px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.pill}"
    padding: "13px 26px"
  button-primary-hover:
    backgroundColor: "#B7911F"
  cta-arrow:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.pill}"
    padding: "8px 8px 8px 26px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.lg}"
---

# Design System: Magicstick Clean

## Overview

**Creative North Star: "The Sunlit Ledger"**

Magicstick Clean is one person's business, not a franchise's marketing department, and the site is built to read that way: the original teal-and-gold identity, brightened. A short-lived pass tried a near-black terracotta world referencing Durable.com; the client asked to bring the teal/gold back and explicitly asked for "beaucoup de lumière" — a lot of light — so this iteration restores the original two-tone identity and pushes every neutral, scrim, and shadow lighter than either previous version.

Density stays calm and editorial (generous section padding, one two-tone accent used for CTAs/links/badges), but the overall feel is warmer and brighter than a restrained monochrome world: a near-white warm cream background, a lighter pale-teal tint for section backgrounds, and softened photo scrims so the splash gate, hero photo, and contact band all read airy rather than heavy.

**Key Characteristics:**
- Deep teal + warm gold as the two-tone brand identity, carried by every CTA, badge, and the spinning contact-badge ring
- A near-white cream background and lighter pale-teal tint sections — brighter than the original teal/gold version, not just a straight revert
- Fraunces (editorial display serif) for every heading, Inter for body and UI — carried over from the terracotta pass, not part of what changed
- Full-pill buttons and CTAs; large-radius, soft-shadow cards — also carried over
- The existing circular logo badge (teal-gradient checkmark + gold sparkle) is a confirmed, untouched legacy asset

## Colors

The palette is a two-tone identity: teal as the primary brand color, gold as its warm counterpart, both used at full saturation rather than restrained to a single accent.

### Primary
- **Teal** (`#0B5D52`, lighter twin `#127A6C`): links, focus states, the primary spinning contact/CTA badge ring color, price/step accents, "confirmed" status pills, the contact-band background.

### Secondary
- **Gold** (`#C9A227`): primary button fills, category labels, numbered steps, FAQ/legal accordion carets, the accent-word highlight, the second color in the spinning contact-badge ring.

### Neutral
- **Charcoal** (`#1F2937`): body text, headings' implicit color, the footer band — a lighter slate than pure black, part of the brightening.
- **Paper** (`#FFFFFF`): cards, forms, the quote/booking panels.
- **Cream** (`#FDFCF9`): the page background and any "tint" section — brightened to near-white.
- **Teal tint** (`#EEF8F6`): the palest teal wash, used for tag pills, "tint" sections, and success/notice banners — lightened past the original version.
- **Neutral text** (`#6B7280`): secondary copy, captions, placeholder text.
- **Hairline** (`#E4E0D4`): borders and dividers.

### Named Rules
**The Two-Tone Rule.** Teal and gold are the only saturated colors on the site, used together rather than one dominant + one secondary — buttons lean gold, links and badges lean teal. No third hue is introduced for a new component without extending this rule deliberately.
**The Light-First Rule.** Every dark or photo-backed surface (splash gate, hero photo, contact band) gets the lightest scrim/overlay that still holds text contrast — when in doubt, lighten it further rather than deepen it.

## Typography

**Display Font:** Fraunces (with Georgia, serif fallback)
**Body Font:** Inter (with Arial, sans-serif fallback)

**Character:** Fraunces' big descenders and editorial weight give headlines the gravity of a considered decision; Inter stays quiet and functional everywhere else so the serif is never competing with its own supporting cast.

### Hierarchy
- **Display** (600, `clamp(2rem, 5vw, 3.5rem)`, 1.08 line-height, -0.01em tracking): hero H1 only.
- **Headline** (600, 34px, 1.08): section headings (`.sec-head h2`).
- **Title** (600, 19–26px, 1.08): card and service-item headings.
- **Body** (400, 17px, 1.55): running copy; paragraphs cap at ~65–75ch via `max-width` in `ch` units.
- **Label** (600, 12.5–14px): nav links, tags, form labels — Inter, not Fraunces.

### Named Rules
**The Serif-Never-Shouts Rule.** Fraunces is reserved for `h1`/`h2`/`h3` and the handful of components that stand in for a heading (service price, step number, brand wordmark). It never appears in body copy, buttons, or form fields.

## Layout

Single max-width wrap (`--max: 1120px`) with 32px side padding (20px under 640px). Sections use flat 80px vertical padding regardless of content, and the homepage alternates paper → cream/tint → teal (contact/offer bands) section by section rather than varying density or a grid system. Cards/grids reflow from 3-up to 1-up under 860px/700px/600px breakpoints depending on the component; no separate desktop/mobile layout system beyond that.

## Elevation & Depth

Hybrid: most surfaces are flat (cards use a hairline border, not a shadow, at rest), but interactive/floating elements carry soft, offset shadows, and the brand's signature CTA elements add a colored glow on hover on top of that base shadow. Shadows use the charcoal neutral, not pure black, so they stay soft rather than heavy.

### Shadow Vocabulary
- **Ambient card** (`0 4px 14px rgba(201,162,39,.35)` on gold-filled buttons; hairline border with no shadow on plain cards): resting depth for buttons and floating panels.
- **Hover glow** (`0 18px 42px rgba(201,162,39,.4)` and dual-tone `rgba(201,162,39,.55)`/`rgba(11,93,82,.4)` glows on the spinning CTA ring): reserved for the primary CTA family (`.cta-arrow`, contact badges) on hover/focus — not used on plain buttons or cards.

### Named Rules
**The Glow-Is-Earned Rule.** Colored halo shadows are reserved for the one CTA family that already spins (the contact badge / arrow button); plain buttons and cards use only neutral charcoal shadows or a hairline border.

## Shapes

Two radius languages by role: **pill** (`100px`) for every button, tag, and badge — the full-pill CTA is the site's clearest signature — and **large soft radius** (16–20px) for cards, panels, and hero photography. Smaller functional chrome (inputs, small icon buttons, dropdowns) keeps a modest 4–8px radius so it doesn't compete with the two primary shapes.

## Components

### Buttons
- **Shape:** full pill (`border-radius: 100px`).
- **Primary (`.btn`):** gold fill, charcoal text, `13px 26px` padding, ambient gold-tinted shadow; hover deepens to `#B7911F` and lifts 1px.
- **Signature CTA (`.cta-arrow`):** white pill with a charcoal label and a trailing circular icon badge that spins the teal/gold ring continuously; hover adds the colored glow and nudges the icon forward. This is the site's one recurring "authored motion" moment, reused for every "Get a quote"-class action.
- **Outline (`.btn-outline` / `.btn-outline-light`):** transparent, charcoal or white border; fills solid on hover.

### Chips
- **Tag pills (`.tag`):** teal-tint background, teal text, full pill — used for the "First-time client special" and similar promotional labels.
- **Status pills:** full-pill, pale-tint background with a matching saturated text color per state (confirmed/new = teal tint, pending = gold tint, cancelled/declined = a muted red — the only non-brand hue, reserved for negative states).

### Cards / Containers
- **Corner Style:** 16px (before/after cards, hub cards, download cards) to 20px (quote form, booking form, hero cover photo).
- **Background:** paper.
- **Shadow Strategy:** hairline border at rest; floating panels (date picker, lightbox, zone modal) add a soft charcoal shadow.
- **Border:** 1–1.5px hairline.
- **Internal Padding:** 24–32px.

### Inputs / Fields
- **Style:** hairline border, cream background, 4–8px radius.
- **Focus:** border shifts to teal.
- **Error:** border and helper text switch to a muted red (`#C0392B`), unrelated to the accent palette.

### Navigation
- Icon-only call/email buttons on desktop (the spinning contact badge carries the affordance; the phone number/email live in the `aria-label` only). Text links get a teal underline-on-hover. Mobile menu is a full-width dropdown with the same spinning contact badges enlarged to 50px.

### Contact Badge (signature component)
A 24px circle with a continuously spinning conic-gradient ring (teal → gold → teal → gold → teal) and a white glyph, prefixed to every phone number and email address sitewide so "this is tappable" reads identically everywhere. Scales up 1.12× on hover/focus of its parent link; respects `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** keep teal and gold as the only saturated hues; every new component should default to charcoal/paper/cream first and reach for the two-tone accent only for action or emphasis.
- **Do** use the full-pill shape for anything that behaves like a button or tag; reserve the 16–20px soft radius for cards and photography.
- **Do** carry the existing circular logo mark (teal-gradient badge, white checkmark, gold sparkle) exactly as-is in any new surface — it is a confirmed legacy asset, not part of this palette decision.
- **Do** theme focus rings, input borders, and link underlines from teal, never from a generic browser blue.
- **Do** default to the lightest plausible scrim/overlay on any photo or dark section — brightness is a stated brand priority now, not a one-time fix.

### Don't:
- **Don't** introduce a third saturated color outside status-pill negative states (the one muted red already in use for errors/cancellations).
- **Don't** apply the spinning colored-glow treatment to anything other than the contact-badge/CTA-arrow family — it is a signature, not a default hover state.
- **Don't** set body copy or UI labels in Fraunces; it is a display face only.
- **Don't** darken a scrim, shadow, or section background back toward the terracotta pass's near-black values — that direction was explicitly reversed.

---

**Not canonized:** the homepage hero's "First-time client special" tag sitting above the H1 is a kicker/eyebrow pattern the craft floor bans outright ("no brief earns it back"). It predates both the terracotta pass and this reversion, and was carried through unchanged both times because it states a real, live promotional commitment (not decoration); it is recorded here as a known defect the build carries, not as a design-system rule.
