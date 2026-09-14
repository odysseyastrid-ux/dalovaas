---
name: Magicstick Clean
description: A one-person cleaning business site in near-black ink, warm paper, and a single terracotta accent
colors:
  ink: "#141414"
  paper: "#FFFFFF"
  mist: "#F5F1EA"
  terracotta: "#D9531F"
  terracotta-light: "#F2703F"
  amber: "#E8A34D"
  accent-tint: "#FBEAE1"
  neutral-text: "#6B6862"
  hairline: "#E5E0D6"
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
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "13px 26px"
  button-primary-hover:
    backgroundColor: "#2b2b2b"
  cta-arrow:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 8px 8px 26px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.lg}"
---

# Design System: Magicstick Clean

## Overview

**Creative North Star: "The Owner-Operator's Ledger"**

Magicstick Clean is one person's business, not a franchise's marketing department, and the site is built to read that way: near-black and white with a single warm terracotta accent, carried by a confident editorial serif that gives the copy the weight of a decision already made rather than a pitch still being sold. The world was reskinned from an incumbent teal/gold, Libre Baskerville + Work Sans identity onto a Durable.com-referenced palette and type pairing (client-supplied reference screenshots), keeping every piece of real business content — photography, copy, contact info, the circular logo mark, and all built functionality — untouched.

Density stays editorial and calm: generous section padding (80px), one accent color used sparingly (CTAs, links, small labels, the spinning contact badge), and alternating paper/mist/ink section backgrounds instead of a busy palette. Confirmed visual rejection: the previous teal + gold dual-accent system, and cool gray/cool cream neutrals (replaced with warm-toned equivalents throughout).

**Key Characteristics:**
- Near-black ink + warm paper/mist neutrals, one terracotta accent (with a lighter amber twin for secondary highlights and the spinning contact badge)
- Fraunces (editorial display serif) for every heading, Inter for body and UI
- Full-pill buttons and CTAs; large-radius, soft-shadow cards
- The existing circular logo badge (teal-gradient checkmark + gold sparkle) is a confirmed, untouched legacy asset — it predates this world and is deliberately not recolored

## Colors

The palette is Restrained: two neutrals plus one accent hue expressed at two weights, used consistently everywhere rather than spread across many named colors.

### Primary
- **Terracotta** (`#D9531F`): links, focus states, the primary spinning contact/CTA badge ring, price/step accents, "confirmed" status pills. This is the one color a visitor should associate with action.

### Secondary
- **Amber** (`#E8A34D`): the accent's lighter twin — category labels, numbered steps, FAQ/legal accordion carets, the accent-word highlight under "offer" in the homepage's one authored heading moment, the second color in the spinning contact-badge ring.

### Neutral
- **Ink** (`#141414`): body text, headings' implicit color, the footer band, primary button fills, the splash gate's fallback background.
- **Paper** (`#FFFFFF`): cards, forms, the quote/booking panels.
- **Mist** (`#F5F1EA`): the page background and any "tint" section — a warm off-white, never cool gray.
- **Accent tint** (`#FBEAE1`): the palest terracotta wash, used for tag pills, "tint" sections, and success/notice banners.
- **Neutral text** (`#6B6862`): secondary copy, captions, placeholder text — warm gray, never cool gray.
- **Hairline** (`#E5E0D6`): borders and dividers.

### Named Rules
**The One Accent Rule.** Terracotta and its amber twin are the only saturated colors on the site. Every other surface is ink, paper, mist, or a neutral warm gray — no third hue is introduced for a new component without extending this rule deliberately.

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

Single max-width wrap (`--max: 1120px`) with 32px side padding (20px under 640px). Sections use flat 80px vertical padding regardless of content, and the homepage alternates paper → mist → accent-tint → ink backgrounds band by band rather than varying density or a grid system. Cards/grids reflow from 3-up to 1-up under 860px/700px/600px breakpoints depending on the component; no separate desktop/mobile layout system beyond that.

## Elevation & Depth

Hybrid: most surfaces are flat (cards use a hairline border, not a shadow, at rest), but interactive/floating elements carry soft, offset shadows, and the brand's signature CTA elements add a colored glow on hover on top of that base shadow.

### Shadow Vocabulary
- **Ambient card** (`0 4px 14px rgba(20,20,20,.25)` on ink-filled buttons; hairline border with no shadow on plain cards): resting depth for buttons and floating panels.
- **Hover glow** (`0 18px 42px rgba(217,83,31,.4)` and dual-tone `rgba(232,163,77,.55)`/`rgba(217,83,31,.4)` glows on the spinning CTA ring): reserved for the primary CTA family (`.cta-arrow`, contact badges) on hover/focus — not used on plain buttons or cards.

### Named Rules
**The Glow-Is-Earned Rule.** Colored halo shadows are reserved for the one CTA family that already spins (the contact badge / arrow button); plain buttons and cards use only neutral ink shadows or a hairline border.

## Shapes

Two radius languages by role: **pill** (`100px`) for every button, tag, and badge — the full-pill CTA is the site's clearest signature — and **large soft radius** (16–20px) for cards, panels, and hero photography. Smaller functional chrome (inputs, small icon buttons, dropdowns) keeps a modest 4–8px radius so it doesn't compete with the two primary shapes.

## Components

### Buttons
- **Shape:** full pill (`border-radius: 100px`).
- **Primary (`.btn`):** ink fill, white text, `13px 26px` padding, ambient ink shadow; hover lightens to `#2b2b2b` and lifts 1px.
- **Signature CTA (`.cta-arrow`):** white pill with an ink label and a trailing circular icon badge that spins the terracotta/amber ring continuously; hover adds the colored glow and nudges the icon forward. This is the site's one recurring "authored motion" moment, reused for every "Get a quote"-class action.
- **Outline (`.btn-outline` / `.btn-outline-light`):** transparent, ink or white border; fills solid on hover.

### Chips
- **Tag pills (`.tag`):** accent-tint background, terracotta text, full pill — used for the "First-time client special" and similar promotional labels.
- **Status pills:** full-pill, pale-tint background with a matching saturated text color per state (confirmed/new = terracotta tint, pending = amber tint, cancelled/declined = a muted red — the only non-brand hue, reserved for negative states).

### Cards / Containers
- **Corner Style:** 16px (before/after cards, hub cards, download cards) to 20px (quote form, booking form, hero cover photo).
- **Background:** paper.
- **Shadow Strategy:** hairline border at rest; floating panels (date picker, lightbox, zone modal) add a soft ink shadow.
- **Border:** 1–1.5px hairline.
- **Internal Padding:** 24–32px.

### Inputs / Fields
- **Style:** hairline border, mist background, 4–8px radius.
- **Focus:** border shifts to terracotta.
- **Error:** border and helper text switch to a muted red (`#C0392B`), unrelated to the accent palette.

### Navigation
- Icon-only call/email buttons on desktop (the spinning contact badge carries the affordance; the phone number/email live in the `aria-label` only). Text links get a terracotta underline-on-hover. Mobile menu is a full-width dropdown with the same spinning contact badges enlarged to 50px.

### Contact Badge (signature component)
A 24px circle with a continuously spinning conic-gradient ring (terracotta → amber → terracotta → amber → terracotta) and a white glyph, prefixed to every phone number and email address sitewide so "this is tappable" reads identically everywhere. Scales up 1.12× on hover/focus of its parent link; respects `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** keep terracotta/amber as the only saturated hues; every new component should default to ink/paper/mist first and reach for the accent only for action or emphasis.
- **Do** use the full-pill shape for anything that behaves like a button or tag; reserve the 16–20px soft radius for cards and photography.
- **Do** carry the existing circular logo mark (teal-gradient badge, white checkmark, gold sparkle) exactly as-is in any new surface — it is a confirmed legacy asset, not part of this palette.
- **Do** theme focus rings, input borders, and link underlines from terracotta, never from a generic browser blue.

### Don't:
- **Don't** introduce a third saturated color outside status-pill negative states (the one muted red already in use for errors/cancellations).
- **Don't** apply the spinning colored-glow treatment to anything other than the contact-badge/CTA-arrow family — it is a signature, not a default hover state.
- **Don't** set body copy or UI labels in Fraunces; it is a display face only.

---

**Not canonized:** the homepage hero's "First-time client special" tag sitting above the H1 is a kicker/eyebrow pattern the craft floor bans outright ("no brief earns it back"). It predates this redesign and was carried through unchanged because it states a real, live promotional commitment (not decoration) and mirrors a pattern visible in the client's own reference screenshots; it is recorded here as a known defect the build carries, not as a system rule — new surfaces should not add further kickers on the strength of this one's presence.
