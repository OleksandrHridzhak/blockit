---
version: 1
name: "Monochrome Editorial Mobile"
colors:
  background: "#121212"
  surface: "#121212"
  surface-muted: "#1E1E1E"
  surface-alt: "#242424"
  on-surface: "#FAFAFA"
  on-surface-variant: "#8E8E8E"
  on-surface-muted: "#525252"
  primary: "#FAFAFA"
  on-primary: "#121212"
  border: "#2E2E2E"
  chart-1: "#FAFAFA"
  chart-2: "#A3A3A3"
  chart-3: "#737373"
  chart-4: "#525252"
  chart-5: "#2E2E2E"
  success: "#22C55E"
  destructive: "#7F1D1D"
typography:
  display-lg:
    fontFamily: "Instrument Sans"
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: -0.04em
  display-md:
    fontFamily: "Instrument Sans"
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -0.03em
  display-sm:
    fontFamily: "Instrument Sans"
    fontSize: 30px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -0.02em
  numeral-xl:
    fontFamily: "Instrument Sans"
    fontSize: 60px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: "Instrument Sans"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline-md:
    fontFamily: "Instrument Sans"
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: "Instrument Sans"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.01em
  body-md:
    fontFamily: "Geist"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0em
  body-sm:
    fontFamily: "Geist"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  label-uppercase-md:
    fontFamily: "Geist"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.2em
  label-uppercase-sm:
    fontFamily: "Geist"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.2em
  label-uppercase-xs:
    fontFamily: "Geist"
    fontSize: 9px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.2em
  eyebrow-wide:
    fontFamily: "Geist"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.4em
rounded:
  none: 0px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  gutter: 24px
  card-padding: 20px
  section-padding: 32px
  section-gap: 64px
icons:
  set: phosphor
  default_variant: light
  active_variant: fill
  stroke_weight: 1px
  default_size: 24px
components:
  card:
    backgroundColor: "{colors.background}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    boxShadow: none
    rounded: "{rounded.none}"
    padding: "{spacing.card-padding}"
  button-primary:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-uppercase-sm}"
    rounded: "{rounded.none}"
    paddingX: 16px
    paddingY: 12px
    border: none
    boxShadow: none
  button-secondary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-uppercase-sm}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    boxShadow: none
    rounded: "{rounded.none}"
    paddingX: 16px
    paddingY: 8px
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-uppercase-xs}"
    border: none
    boxShadow: none
    rounded: "{rounded.none}"
    gap: 12px
  button-icon:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-surface}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    boxShadow: none
    rounded: "{rounded.none}"
    size: 48px
    iconSize: 24px
  input-text:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    boxShadow: none
    rounded: "{rounded.none}"
    paddingX: 14px
    paddingY: 12px
    focusRingColor: "{colors.on-surface}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-uppercase-md}"
    border: none
    boxShadow: none
    rounded: "{rounded.none}"
    paddingX: 0px
    paddingY: 20px
  chip-active:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-uppercase-md}"
    borderColor: "{colors.on-surface}"
    borderWidth: 0px
    boxShadow: none
    rounded: "{rounded.none}"
    paddingX: 0px
    paddingY: 20px
  badge-pill:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-uppercase-xs}"
    border: none
    boxShadow: none
    rounded: "{rounded.none}"
    paddingX: 8px
    paddingY: 2px
  badge-circle:
    backgroundColor: "{colors.on-surface}"
    borderColor: "{colors.background}"
    borderWidth: 1px
    boxShadow: none
    rounded: "{rounded.full}"
    size: 12px
  avatar:
    backgroundColor: "{colors.surface-muted}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    boxShadow: none
    rounded: "{rounded.none}"
    size: 48px
  list-row:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-surface}"
    border: none
    boxShadow: none
    rounded: "{rounded.none}"
    paddingX: 24px
    paddingY: 24px
  progress-bar:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    border: none
    boxShadow: none
    rounded: "{rounded.none}"
    height: 2px
  progress-ring:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    border: none
    boxShadow: none
    rounded: "{rounded.full}"
    size: 96px
  top-app-bar:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-surface}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    boxShadow: none
    rounded: "{rounded.none}"
    paddingX: 24px
    paddingY: 32px
  tab-bar:
    backgroundColor: "{colors.background}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    boxShadow: none
    rounded: "{rounded.none}"
    height: 76px
    paddingX: 48px
  tab-item-active:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-uppercase-xs}"
    iconSize: 24px
    border: none
    boxShadow: none
    rounded: "{rounded.none}"
  tab-item-inactive:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-uppercase-xs}"
    iconSize: 24px
    border: none
    boxShadow: none
    rounded: "{rounded.none}"
---

# Monochrome Editorial Mobile

## Overview

**Severe, editorial, instrument-panel calm.** This is a black-canvas aesthetic that treats the screen like a printed broadsheet: hairline rules carve space, headings are set in a quiet humanist sans with negative tracking, and everything else whispers in widely-tracked uppercase. There is no color — only luminance — and no rounded corners — only right angles. Decoration is forbidden; structure does the work.

The mood is **cold-hot**: cold from the all-monochrome palette and zero ornament, hot from the editorial confidence of large display headings, generous whitespace, and the way every element commits to a clear hierarchical role. Think science journal cover, swiss-grid magazine spread, or a high-end audio component's UI. Density is balanced — not packed, not airy — and the rhythm is set by hairline borders rather than shadows or fills.

## Colors

The palette is **a 7-step grayscale from near-black to near-white, plus one accent green for positive deltas**. There are no chromatic colors used as UI chrome — none. Saturation is reserved exclusively for semantic deltas (a small rise/fall indicator), never for backgrounds, headings, or decoration.

- `{colors.background}` (#121212) — the global canvas. Cards sit on this, the tab bar sits on this, top app bar sits on this. There is **no card-fill differentiation** — surfaces are defined by their hairline border, not by a tonal lift.
- `{colors.surface-muted}` (#1E1E1E) — used very sparingly as the rail/track behind progress bars and as a 20–50% atmospheric tint behind featured insight blocks.
- `{colors.surface-alt}` (#242424) — reserved for input/secondary surface differentiation when one is needed.
- `{colors.on-surface}` (#FAFAFA) — the primary foreground. Headings, active filled progress, active tab icons, primary button fill.
- `{colors.on-surface-variant}` (#8E8E8E) — secondary text, inactive tab labels, eyebrow kickers, axis labels.
- `{colors.on-surface-muted}` (#525252) — tertiary text and disabled states.
- `{colors.border}` (#2E2E2E) — the workhorse. Every component separation comes from this hairline. It is also the default fill for inactive bar-chart bars.
- `{colors.chart-2}` through `{colors.chart-5}` — a stepped grayscale ramp for multi-series charts. Bars and lines use these tones positionally, never tied to a category color.
- `{colors.success}` (#22C55E) — used **only** as inline foreground color for positive change indicators (e.g. small "+/-2%" callouts with a trend icon). Never as a fill, never on a chip, never as a card background.

**Hard rule**: hue is forbidden in chrome. If the implementer feels the urge to "add a color accent," the answer is to add typographic weight, an uppercase kicker, or a hairline rule instead.

## Typography

Two typefaces, used as a deliberate pair:

- **Instrument Sans** (`font-heading`) — every heading, every numeral that has display weight. A humanist sans with subtle warmth at large sizes. Always used at **weight 400 (Regular)** with **negative tracking** (`-0.01em` to `-0.04em`). Never bolded — the size and tracking carry the emphasis.
- **Geist** (`font-sans`) — the body and label workhorse. Used at 400 for body, 500/600/700 for uppercase tracked labels.

JetBrains Mono and Playfair Display are declared in CSS but not actively used — leave them as fallback availability only.

**Tracking philosophy** is the signature move:
- Headings (Instrument Sans): aggressively *tightened* (-0.02em to -0.04em) — letters touch, the line feels compressed and editorial.
- Uppercase labels (Geist): aggressively *loosened* (0.2em to 0.4em) — letters are sparse, almost diagrammatic.

The two opposing tracking moves create the entire visual texture of the system. Body text sits at neutral 0em.

**Role mapping:**
- `{typography.display-lg}` — large screen titles ("Goals"-tier headers).
- `{typography.display-md}` — secondary hero titles, image-overlay titles.
- `{typography.numeral-xl}` — oversized data numerals on hero metric cards (bpm, score, count).
- `{typography.headline-lg}` — section-detail titles (chart panel headings).
- `{typography.headline-md}` — list-row primary titles, secondary card titles.
- `{typography.headline-sm}` — small card group titles.
- `{typography.body-md}` — paragraph copy in insight blocks.
- `{typography.body-sm}` — secondary paragraph copy.
- `{typography.label-uppercase-md}` — tab/filter labels (11px, 0.2em).
- `{typography.label-uppercase-sm}` — kickers and metadata captions (10px, 0.2em).
- `{typography.label-uppercase-xs}` — bottom tab labels and the smallest meta (9px, 0.2em).
- `{typography.eyebrow-wide}` — pre-title eyebrows above hero headers (10px, 0.4em).

**Numerals**: large stat numerals use Instrument Sans, NOT a monospace. The negative tracking makes a `64` feel like a single typographic gesture rather than two digits. Pair the numeral with a small lowercase or uppercase unit to its right (`bpm`, `L`, `%`) in `body-md` or `label-uppercase-sm` — the contrast in size, weight, and case is the recurring rhythm of the system.

## Spacing & Layout

**Density is balanced-leaning-airy.** The grid is a strict 24px screen gutter with section gaps of 48–64px between major content blocks, creating a magazine-like vertical rhythm. Inside cards, padding is 20–24px symmetric.

The visual rhythm is set by **hairline rules at major breakpoints** — header-to-content, section-to-section, row-to-row in lists. These rules replace the shadow/elevation that other systems use. Use `border-b border-border` at the bottom of headers, between filter/tab strips, and `gap-px bg-border` to create hairline-separated grid cells (see "Hairline grid" below).

Reference values:
- `{spacing.gutter}` (24px) — screen edge inset and the dominant horizontal breathing space.
- `{spacing.section-padding}` (32px) — header vertical padding, top-of-screen breathing room.
- `{spacing.section-gap}` (64px) — vertical gap between major page sections.
- `{spacing.card-padding}` (20px) — internal card padding for compact tiles; widen to 24–32px for hero/feature panels.

Headers tend to use **larger** vertical padding (48–64px top, 32–48px bottom) than content sections — the page's first breath is generous, then content settles into a tighter rhythm.

## Elevation & Depth

**There is no elevation.** No shadows are used anywhere. Hierarchy is conveyed by:

1. **Hairline borders** (`{colors.border}`, 1px) — separating cards, rows, sections, header-from-content.
2. **Tonal grayscale steps** — luminance contrast between foreground and background carries weight.
3. **Negative space** — the surrounding silence of a heading or numeral is what makes it loud.
4. **Typographic weight** — large + tightly-tracked = primary; small + loosely-tracked = secondary.

If a future implementer feels a card needs to "lift," the answer is to add a hairline border or a thicker top border, not a shadow.

## Shapes

**Zero radius. Everywhere.** The base radius variable is `0rem`. Every card, button, input, image, badge, and chip is a perfect rectangle. The only exception is `{rounded.full}` for circular elements (the small notification dot on an avatar, circular progress rings, the disc inside a `badge-circle`).

This is a load-bearing aesthetic decision — softening any corner breaks the system. Even profile images and hero photographs are rendered as sharp rectangles.

## Components

### card

A bordered rectangle on the page background. No fill differentiation, no shadow, no radius. The hairline border is the entire visual treatment.

```html
<div class="border border-border bg-background p-5 flex flex-col justify-between">
  <div class="flex justify-between items-start mb-6">
    <h2 class="font-[Instrument_Sans] text-lg text-muted-foreground">[Card title]</h2>
    <iconify-icon icon="ph:[icon-name]-light" class="size-6 text-foreground"></iconify-icon>
  </div>
  <div class="flex items-baseline gap-2">
    <span class="text-6xl font-[Instrument_Sans] tracking-tight leading-none">[Value]</span>
    <span class="text-sm text-muted-foreground uppercase tracking-wider">[Unit]</span>
  </div>
</div>
```

**Hover treatment** (optional): `hover:border-foreground/30 transition-colors` to brighten the hairline on hover — subtle and the only animation the system uses.

### Hairline grid (composition recipe — NOT a separate component)

A signature compositional move: to render a 2×N grid of stat tiles, wrap them with `bg-border` and an outer `border border-border`, then set inner `gap-px`. The 1-pixel gap fills with the border color, creating a continuous hairline lattice that visually divides every cell without doubling borders. Each cell is `bg-background p-6`.

```html
<div class="grid grid-cols-2 gap-px bg-border border border-border">
  <div class="bg-background p-6">…</div>
  <div class="bg-background p-6">…</div>
  <div class="bg-background p-6">…</div>
  <div class="bg-background p-6">…</div>
</div>
```

### button-primary

Solid white block with black uppercase tracked-out label. Hover inverts to bordered ghost.

```html
<button class="bg-foreground text-background px-4 py-3 text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-background hover:text-foreground hover:border hover:border-border transition-colors">
  [Label]
</button>
```

### button-secondary

Hairline-bordered ghost button. Hovers to inverted (white fill, black text).

```html
<button class="flex items-center gap-2 border border-border px-4 py-2 hover:bg-foreground hover:text-background transition-colors">
  <iconify-icon icon="ph:[icon-name]-light" class="size-5"></iconify-icon>
  <span class="text-[10px] uppercase tracking-widest font-medium">[Label]</span>
</button>
```

### button-text

A bare uppercase tracked label, often paired with a trailing arrow icon that translates on hover.

```html
<button class="group flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-bold">
  <span>[Label]</span>
  <iconify-icon icon="ph:arrow-right-light" class="size-[18px] group-hover:translate-x-1 transition-transform"></iconify-icon>
</button>
```

### button-icon

48×48 hairline-bordered square containing a single light-weight icon. The page-action button (e.g. add/new).

```html
<button class="size-12 border border-border flex items-center justify-center hover:bg-foreground hover:text-background transition-all duration-300">
  <iconify-icon icon="ph:[icon-name]-light" class="size-6"></iconify-icon>
</button>
```

### input-text

Hairline-bordered rectangle, no radius, focus inverts/brightens the border.

```html
<input type="text" placeholder="[Placeholder]"
  class="w-full bg-background text-foreground border border-border px-3.5 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors" />
```

### chip & chip-active (segmented filter strip)

Filters are NOT rounded pills — they are a horizontal strip of equal-flex buttons divided by hairline rules, with the active item filled white. A second pattern is an underline tab strip (see below); both share the uppercase tracked typography.

```html
<!-- Segmented bar (chip variant) -->
<div class="flex border border-border">
  <button class="flex-1 py-3 text-[10px] uppercase tracking-[0.2em] font-medium border-r border-border bg-foreground text-background">[Active]</button>
  <button class="flex-1 py-3 text-[10px] uppercase tracking-[0.2em] font-medium border-r border-border hover:bg-muted transition-colors">[Item]</button>
  <button class="flex-1 py-3 text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-muted transition-colors">[Item]</button>
</div>

<!-- Underline tab strip (alt chip pattern) -->
<div class="border-b border-border overflow-x-auto">
  <div class="flex whitespace-nowrap px-6">
    <button class="py-5 mr-8 border-b-2 border-foreground text-[11px] uppercase tracking-widest font-semibold">[Active]</button>
    <button class="py-5 mr-8 border-b-2 border-transparent text-muted-foreground hover:text-foreground text-[11px] uppercase tracking-widest font-medium transition-all">[Item]</button>
  </div>
</div>
```

### badge-pill

A small filled rectangle (NOT a pill — the name is conventional, the shape is square). White fill, black tracked uppercase label.

```html
<span class="text-[9px] bg-foreground text-background px-2 py-0.5 uppercase tracking-widest font-bold inline-block">[Label]</span>
```

### badge-circle

The lone circular element in the system. A 12px white disc with a 1px background-color border, positioned absolutely on an avatar to indicate status.

```html
<div class="absolute -top-1 -right-1 size-3 bg-foreground rounded-full border border-background"></div>
```

### avatar

A 48px square image with a hairline border. NEVER circular.

```html
<img alt="[Alt]" src="[URL]" class="border border-border object-cover size-12" />
```

### list-row

Hairline-separated rows on the background canvas. To stack them, wrap in `space-y-px bg-border` so the 1px gap fills as a divider — same trick as the hairline grid.

```html
<div class="space-y-px bg-border">
  <div class="bg-background p-6 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer">
    <div class="flex flex-col gap-1">
      <h4 class="font-[Instrument_Sans] text-xl tracking-tight">[Row title]</h4>
      <p class="text-[10px] text-muted-foreground uppercase tracking-widest">[Metadata]</p>
    </div>
    <div class="text-right">
      <p class="text-2xl font-[Instrument_Sans] tracking-tighter">[Value]</p>
      <p class="text-[9px] text-muted-foreground uppercase tracking-widest">[Status]</p>
    </div>
  </div>
</div>
```

### progress-bar

Always exactly **2px tall**, no radius. Track is `{colors.surface-muted}` or `{colors.border}`; fill is `{colors.on-surface}` (primary) or a stepped chart gray for secondary series.

```html
<div class="h-[2px] bg-muted w-full">
  <div class="h-full bg-foreground w-[45%] transition-all duration-1000"></div>
</div>
```

### progress-ring

SVG circle, `stroke-linecap="square"`, no radius softening. Inactive track is `{colors.border}`, fill is `{colors.on-surface}`. Multi-ring composition uses stepped grays for the inner ring(s).

```html
<svg viewBox="0 0 100 100" class="size-24 -rotate-90">
  <circle r="42" cx="50" cy="50" fill="transparent" stroke="var(--border)" stroke-width="2" />
  <circle r="42" cx="50" cy="50" fill="transparent" stroke="var(--foreground)" stroke-width="3"
    stroke-linecap="square" stroke-dasharray="263.89" stroke-dashoffset="65" />
</svg>
```

### Bar chart (composition recipe — NOT a separate component)

Bar charts are flex rows of `flex-1` divs with percentage heights. Inactive bars use `{colors.border}`; the highlighted/current bar uses `{colors.on-surface}`. No radius, no spacing-tricks. A 1.5px gap between bars (`gap-1.5`) is typical; for denser bars use `gap-1`.

```html
<div class="h-40 flex items-end gap-1.5">
  <div class="flex-1 h-[60%] bg-border hover:bg-foreground transition-colors"></div>
  <div class="flex-1 h-[85%] bg-foreground"></div>
  <div class="flex-1 h-[70%] bg-border hover:bg-foreground transition-colors"></div>
</div>
```

### top-app-bar

Generous 48–64px top padding, 32px bottom padding, hairline bottom border. Title in `display-lg`, often preceded by an `eyebrow-wide` kicker. A trailing `button-icon` or `button-secondary` aligns to the baseline of the title block.

```html
<header class="px-6 pt-12 pb-8 border-b border-border">
  <div class="flex items-end justify-between">
    <div>
      <p class="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-2">[Eyebrow]</p>
      <h1 class="font-[Instrument_Sans] text-5xl font-normal tracking-tighter leading-none">[Title]</h1>
    </div>
    <button class="size-12 border border-border flex items-center justify-center hover:bg-foreground hover:text-background transition-all">
      <iconify-icon icon="ph:plus-light" class="size-6"></iconify-icon>
    </button>
  </div>
</header>
```

### tab-bar / tab-item-active / tab-item-inactive

Fixed bottom bar with a 1px top border. Items are stacked icon-over-label, both colored together (no pill, no underline, no fill). Active state is simply the foreground color; inactive is `on-surface-variant`. The active icon may swap to its filled variant.

```html
<nav class="fixed bottom-0 w-full bg-background border-t border-border px-12 py-5 z-50">
  <ul class="flex items-center justify-between max-w-md mx-auto">
    <li>
      <a href="#" class="flex flex-col items-center gap-2 text-foreground">
        <iconify-icon icon="ph:[icon-name]-fill" class="size-6"></iconify-icon>
        <span class="text-[9px] uppercase tracking-[0.2em] font-medium">[Label]</span>
      </a>
    </li>
    <li>
      <a href="#" class="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <iconify-icon icon="ph:[icon-name]-light" class="size-6"></iconify-icon>
        <span class="text-[9px] uppercase tracking-[0.2em] font-medium">[Label]</span>
      </a>
    </li>
  </ul>
</nav>
```

### Tonal recipes (NOT separate components)

- **Featured insight panel**: render `card` with `bg-muted/20` instead of `bg-background`. Optionally place a large, very low-opacity icon (`text-foreground/10 text-6xl`) anchored top-right as a watermark. This is the only context where a tonal lift is permitted.
- **Trend delta indicator**: an inline row of `<iconify-icon icon="ph:trend-up-bold|trend-down-bold">` followed by `text-[10px] uppercase tracking-widest font-medium` text, colored `text-green-500` (rise) or `text-red-500` (fall). The only chromatic moment in the system.
- **Stat block**: `label-uppercase-sm` kicker → `display-sm` numeral → optional small unit. No surrounding border when used inside a hairline-grid cell.

## Iconography

**Phosphor** is the icon set. The variant convention is the load-bearing decision:

- **`light`** is the default — thin 1px strokes, long sweeping curves. This matches the editorial restraint of the type system. Used everywhere except active tab states.
- **`fill`** is reserved for the active bottom-tab icon and rare emphasis moments (a watermark `sparkle-fill` behind a featured insight). Filled variants in any other context will read as visually loud and break the system.
- **`bold`** is permitted only for the small inline trend arrows (`trend-up-bold`, `trend-down-bold`) where the arrow needs to read at 10–12px next to tracked-out type.

Default icon size is **24px** in tab bars and section headers; 18–20px inline next to body text; 32px for large category icons in feature grids; 60–80px for low-opacity watermark icons.

**Phosphor `regular` variant note**: Phosphor's "regular" weight has NO suffix. If a future implementer wants the regular weight, write `ph:user` — never `ph:user-regular` (that does not exist and renders as a missing-icon glyph). For this system, prefer `light` over `regular` anyway; only fall back to bare names if `light` is too thin for a particular tiny size.

## Illustration & Imagery

This aesthetic uses **photography, not illustration**, and the source HTML contains two photographic images: a portrait avatar and a hero landscape behind a goal card. Both are treated identically by the system — desaturated, sharp-edged, and used as compositional anchors rather than decoration.

- **Style / Technique**: full-frame photography, silver-gelatin grade. High contrast, deep blacks, blown-out highlights, atmospheric haze welcomed. The portrait sample shows a naturalistic outdoor portrait; the landscape sample shows a high-key silhouette against fog and sun. Both feel *photojournalistic* — captured, not staged. Photo editorial rather than commercial-glossy.
- **Palette**: monochrome — black, gray, white only. Apply `grayscale` CSS filter to ANY photograph regardless of source, even if the source is in color (the avatar shown is shipped in color; in this aesthetic it would be presented grayscaled, or with the brightness reduced as in the goal-card hero treatment). Never tint, never duotone.
- **Edge treatment**: hard rectangular crops, NO border-radius, NO outline strokes, NO vignette overlays as a stylistic effect (the gradient overlay is for legibility, not style — see Container styling).
- **Shading & light**: high-contrast lighting with crushed shadow detail. Welcome backlighting, silhouettes, fog, and atmospheric haze. Avoid evenly-lit studio looks.
- **Composition & framing**: subject often dwarfed by environment (a small silhouette in a vast scene), or tightly cropped portraits with eye-line confidence. Generous negative space inside the photo so a heading set on top has room to breathe. Subject can be central or off-center; what matters is that the scene reads at thumbnail size.
- **Background within the photograph**: continuous environment — sky, fog, road, landscape. NOT a flat studio backdrop.
- **Container styling**: rectangular frame, **`{rounded.none}` (zero radius)** — read directly from `class="w-full aspect-[16/9]"` and `class="size-12"` in the HTML, neither of which has any rounding utility. Avatar is 48×48 with a 1px hairline border (`border border-border`). Hero photographs are full-bleed inside their card (no inner padding around the image, no inner border).
- **CSS treatment on the `<img>` element** (READ FROM HTML EXACTLY):
  - Avatar: `class="rounded-none border border-border object-cover size-12"` — `object-cover`, no filter, no blend.
  - Hero image: `class="w-full aspect-[16/9] object-cover grayscale brightness-75 group-hover:scale-105 transition-transform duration-700"` — `object-cover` + **`grayscale`** + **`brightness-75`** are the load-bearing aesthetic filters. A subtle hover scale (1.05) over 700ms is the only animation.
  - Always apply at least `grayscale` to hero photography; `brightness-75` is recommended when text overlays the image.
- **Box-shadow on the image or its frame**: **none** — images sit flat on the surface, framed only by the card border (avatar) or by their crop edge (hero).
- **Aspect ratio rule**: avatars are 1:1 squares (`size-12`); hero images are 16:9 (`aspect-[16/9]`). Never circular, never asymmetric. Preserve aspect via `object-cover`.
- **Text-on-image overlay**: a vertical gradient `bg-gradient-to-t from-background/80 to-transparent` is laid over the bottom of the photograph to anchor headline + metadata. Headlines on images use the same `display-md`/`display-sm` Instrument Sans treatment as elsewhere; metadata stays in `label-uppercase-sm`. A `badge-pill` may sit above the headline.
- **Anti-references**: NOT illustrated, NOT 3D rendered, NOT vector, NOT clay, NOT paper-cut, NOT pastel, NOT bright, NOT colorful, NOT cartoon, NOT iconographic, NOT staged-product, NOT lifestyle-stock-glossy, NOT rounded-corner, NOT tinted-duotone.
- **Style recipe prompt**:

> *Black-and-white photograph of [SUBJECT], silver-gelatin grade, high contrast with deep blacks and slightly blown highlights, atmospheric haze welcomed, photojournalistic and naturalistic rather than staged, generous negative space, hard sharp focus on the subject. Monochrome only — pure grayscale, absolutely no tint or duotone. Hard rectangular crop, no vignette, no border, no rounded corners. Editorial broadsheet sensibility, calm and severe. NOT illustrated, NOT 3D, NOT vector, NOT pastel, NOT colorful, NOT cartoon, NOT studio-glossy.*

When a future brief calls for "an illustration," answer with a photograph treated this way instead. When a future brief calls for "an avatar," use a 1:1 photograph with `grayscale` applied (or accept color only on the user's own profile photo, with a hairline border framing it).

## Hierarchy & Emphasis

Three signals drive emphasis, in priority order:

1. **Size**: a tightly-tracked Instrument Sans numeral at 48–60px is always the loudest element on the screen.
2. **Hairline rule**: a `border-b` separating a header from content tells the eye "this matters."
3. **Tracked uppercase weight**: a `font-bold tracking-[0.2em]` label reads as a UI affordance, not as content.

Saturation does NOT drive emphasis — we have no saturation to spend. Color is reserved for inline trend deltas only.

Type-of-thing rules (not screen-specific):
- The largest numeral on any screen is the primary metric.
- Eyebrow kickers always whisper above their headline.
- Metadata always lives in `label-uppercase-sm`/`xs` and is colored `on-surface-variant`.
- Active states are conveyed by **fill swap** (white block on black) or **icon variant swap** (light → fill), never by an accent hue.

## Distinctive Details

1. **The hairline lattice grid** — `gap-px` over a `bg-border` parent creates a continuous 1px divider grid for stat tiles, list rows, and feature cells. This is the system's fingerprint.
2. **Opposing tracking** — display headings squeezed (-0.02 to -0.04em) AND uppercase labels stretched (+0.2 to +0.4em) on the same screen. The tension between the two is the entire visual identity.
3. **Watermark icon** — featured insight panels place a single Phosphor `fill` icon at 60–80px in `text-foreground/10` (10% opacity), anchored top-right and partially clipped by the panel edge. The only ornamental gesture the system permits.
4. **Hover-inverts** — interactive elements (buttons, segmented bar items) hover by inverting their fill (`bg-foreground hover:bg-background` or vice versa) rather than tinting. Reinforces the strict two-tone palette.

## Do's and Don'ts

### Do

- Use hairline borders (`{colors.border}`, 1px) as the primary separator everywhere.
- Set every heading in Instrument Sans 400 with negative tracking. Trust size for emphasis, not weight.
- Set every UI label in Geist uppercase with `tracking-[0.2em]` or `tracking-[0.4em]`.
- Apply `grayscale` (and `brightness-75` if needed for legibility) to all photographs, including avatars.
- Use the `gap-px` over `bg-border` trick for hairline-divided grids and stacked rows.
- Reserve filled (`-fill`) Phosphor icons for the single active tab and rare watermark moments only.
- Use 0 radius. Everywhere except the small `badge-circle` notification dot and SVG progress rings.
- Render numerals in Instrument Sans (not in a monospace) and pair them with a small uppercase unit.

### Don't

- Don't add color. No accent blue, no brand teal, no warning amber. The only chromatic moment is the inline green/red trend delta.
- Don't add shadows. No `shadow-sm`, no glow, no elevation. Hairline borders carry hierarchy.
- Don't round corners. No `rounded-md`, no `rounded-lg`, no soft pill chips, no circular avatars.
- Don't bold headings. Instrument Sans Regular (400) carries every heading.
- Don't use bold or filled icon variants as a default. `light` is the system; deviating breaks it.
- Don't tile-fill cards in a tonal lift to indicate elevation. Cards are `bg-background` with a hairline border, period.
- Don't use illustrations, 3D renders, or colorful imagery. Photography only, grayscaled.
- Don't write `ph:user-regular` — Phosphor's regular variant has no suffix; use `ph:user` (and prefer `ph:user-light` here).
- Don't compose tab bars with pill backgrounds, underlines, or active-state fills. Color swap + icon-variant swap is enough.
- Don't fall back to a softer neutral palette (warm off-whites, cool blues). The black is `#121212`, the white is `#FAFAFA`, and they don't drift.
