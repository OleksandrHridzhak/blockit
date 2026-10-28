# Kivi — Design System

> **Product:** a calm, friendly screen-time app that creates a small, intentional pause before opening distracting apps.
>
> **Design direction:** Grass Green × White · rounded iOS-native UI · minimal, modern, playful but not childish.
>
> **Status:** v1 design specification. Use this document as the default reference when building new screens and components.

## 1. Brand feeling

**Kivi is a friendly companion, not a strict blocker.** The interface should feel calm, trustworthy, optimistic, and reassuring. It invites people to make conscious choices rather than shaming them for opening an app.

- **Calm:** plenty of space, light backgrounds, short copy, subtle movement.
- **Friendly:** soft corners, simple illustrations, mascot reactions.
- **Clear:** one main action per screen, readable hierarchy, easy-to-scan stats.
- **Playful:** animation and character personality, without gamification clutter.

**Visual keywords:** fresh, soft, organic, clean, rounded, encouraging.

## 2. Color palette

Use **solid HEX colors only**. Do not use alpha/opacity for surfaces, text, icons, shadows, overlays, borders, or interaction states. Make alternate colors explicitly if needed. Flat fills are the default; avoid prominent gradients.

| Token | HEX | Use |
|---|---|---|
| `primary` | `#2A7E3B` | Primary CTA, active navigation, brand, mascot body |
| `accent` | `#46A758` | Highlights, progress, decorative details, small icons |
| `secondary` | `#8FCF94` | Mascot surroundings, positive illustrations, progress accents |
| `border` | `#B6E4B9` | Soft outlines and separators |
| `surface` | `#E9F6E9` | Secondary buttons, highlighted panels, chips |
| `background` | `#F5FBF5` | App background, breathing screens, illustrations |
| `white` | `#FFFFFF` | Cards, content surfaces, white text on primary |
| `text` | `#203C25` | Headers, body text, main icon strokes |
| `textSecondary` | `#55765D` | Subtitles, explanatory text, secondary labels |

### Color proportions

- Roughly **70% white / pale background**, **20% light green surfaces**, **10% saturated green accents**.
- Default screen: `background` canvas + `white` cards + `text` typography.
- Primary button: `primary` background + `white` label.
- Secondary button: `surface` background + `text` label.
- Use `accent` for progress and decoration, **not** for small white button labels: white on `#46A758` has insufficient normal-text contrast.
- Do not paint every element green. Empty space is part of the brand.

### Accessibility contrast

- `white` on `primary` ≈ **5.07:1** (passes WCAG AA for normal text).
- `textSecondary` on `white` ≈ **5.08:1**.
- `textSecondary` on `background` ≈ **4.84:1**.
- `text` on `surface` ≈ **10.85:1**.
- Use color **plus** a label/icon to communicate state. Never rely on green vs. another color alone.

## 3. Typography

**Font:** use **SF Pro** on iOS for a native feel. **SF Pro Rounded** for short hero headings or mascot-centric moments, if available. For cross-platform builds use **Inter** as fallback. Do not mix many font families.

| Role | Size | Weight | Line height |
|---|---:|---|---:|
| Display / intro | 32 px | 700 | 38 px |
| Screen title | 26 px | 700 | 32 px |
| Section title | 20 px | 600 | 26 px |
| Card title | 16 px | 600 | 22 px |
| Body | 15–16 px | 400 | 22–24 px |
| Button label | 15–16 px | 600 | 20–22 px |
| Caption / meta | 12–13 px | 400–500 | 17–19 px |

Use sentence case, not all-caps. Keep intervention copy short and human.

## 4. Layout & geometry

- **Spacing scale (px):** `4, 8, 12, 16, 20, 24, 32, 40, 48`.
- **Horizontal screen padding:** 20–24 px.
- **Default vertical rhythm:** 16–24 px between related blocks; 32–40 px between sections.
- **Card radius:** 20–24 px.
- **Button radius:** 16–20 px, or pill for hero CTAs.
- **Small controls/chips:** 12–14 px radius.
- **App icon:** square artwork with iOS system-applied corner masking; do not bake in an extra visible outer frame.
- **Minimum touch target:** 44 × 44 pt.
- Prefer **solid-color layers with a soft border** instead of transparent shadows. Use no opacity values.
- Respect safe areas and Dynamic Type; content must survive small screens and large text sizes.

## 5. Kivi mascot

### Identity

Kivi is a small green creature resembling a **rounded arch / soft ghost / sprout**:

1. One simple domed body with a flat-to-softly-curved bottom.
2. Deep-green face/body (`primary`, with optional darker shape detail using `text`).
3. Two **vertical white pill-shaped eyes**, also readable as the **pause symbol `Ⅱ`**.
4. A soft light-green outline or rim (`border`/`secondary`).
5. One leaf above the head, tilted slightly to the right (`accent`).
6. Optional flat elliptical ground patch (`secondary`) for large illustrations.

**The pause-bar eyes are the key identifying feature.** Preserve their proportion, spacing and readability across all states. The mascot should remain recognizable at 48 × 48 px.

### Mascot variants

- **App icon:** simplified full-body silhouette, two pause eyes, one leaf, no tiny expression details; white or very pale green canvas.
- **Hero illustration:** full mascot + soft ground patch, centered with generous negative space.
- **Small in-card companion:** reduced mascot, minimal outline and no extra decoration.
- **Celebration:** eyes turn into gently curved happy lines and the leaf tilts, then returns to normal.
- **Breathing:** body subtly expands/contracts, the eyes softly close and reopen.

### Animation guidelines

| State | Motion | Timing |
|---|---|---|
| Idle | Body breathes vertically/very slightly scales; leaf sways | 3–4 s loop |
| Looking around | Both pause-bar eyes shift together horizontally and return | 1.5–2.5 s |
| Blink | Eyes squash vertically then reopen | 120–180 ms |
| Curious | Body leans 4–6° and leaf follows | 300–450 ms |
| Success | One small squash-and-stretch bounce | 450–650 ms |
| Breathing | Slow expansion on inhale, contraction on exhale | Match breathing timer |

Keep animations subtle and interruptible. Avoid constant excited bouncing while the user is deciding whether to open an app. Pause unnecessary loops when off-screen and honor **Reduce Motion** with static states. For implementation, use independently animated vector layers (body, eyes, leaf), e.g. SVG + React Native Reanimated or Rive.

## 6. Reusable components

### Primary button

- Fill `primary`, label `white`, height 52–56 px, radius 18 px.
- Medium/semibold centered label; optional small arrow on the right.
- Examples: **Stay focused**, **Continue**, **Start breathing**.

### Secondary button

- Fill `surface`, label `text`, height 48–54 px, radius 18 px.
- Examples: **Open anyway**, **Remind me later**, **Skip**.
- Do not hide or visually disable the user's ability to continue.

### Cards

- Fill `white`, radius 20–24 px, padding 16–20 px.
- Optional thin solid `border` stroke.
- Content hierarchy: small label → large metric/heading → short explanation.

### Segmented controls, chips, switches

- Inactive: `surface` or `white`; text `textSecondary`.
- Active: `primary` with `white` text, or a clearly outlined state.
- Switch track off: `border`; on: `primary`; thumb: `white`.
- Never indicate state with color alone.

### Navigation

- iOS-style bottom tab bar on dashboard areas only; 3–4 primary destinations.
- Suggested tabs: **Home**, **Insights**, **Interventions**, **Settings**.
- Active icon/label: `primary`; inactive: `textSecondary`.
- Prefer simple stroke icons (SF Symbols on iOS, Lucide as cross-platform fallback).

## 7. Screen blueprints

### A. Welcome / onboarding

- Background `background`.
- Centered Kivi hero at 35–45% of available screen height.
- Large wordmark: **Kivi**.
- Two-line tagline: **Less scrolling, more living.**
- Bottom primary CTA: **Get started**.
- Optional subtle green organic hill shapes near the bottom; do not obscure content.

### B. Intervention / pause screen

**Purpose:** add a short moment of friction without shame or coercion.

1. Small app row: target icon + **Instagram** + “Time for a pause?”
2. Large centered Kivi, looking at the user.
3. Heading: **Take a moment**.
4. Prompt: **Do you really want to open Instagram?**
5. Full-width primary CTA: **Stay focused**.
6. Full-width secondary CTA: **Open anyway**.
7. Optional tertiary action: **Remind me in 5 minutes**.

Use a calm, balanced arrangement. Avoid guilt language and fake urgency. The choice to open anyway must remain clear and accessible.

### C. Home / dashboard

- White/light-green canvas and top app title **Kivi**, small settings icon.
- Seven small day indicators for weekly progress.
- Main cards: **Screen time** (actual duration, trend if available), **Focus streak** (measured days), **Today** (apps tracked).
- App rows: icon, name, measured duration, optional trend, chevron.
- Tab bar anchored to safe area.
- Keep dashboard data real; show an empty state instead of fabricated statistics.

### D. Breathing intervention

- Nearly full-screen `background`, minimal chrome.
- Center Kivi, eyes closed while breathing.
- Heading changes between **Breathe in…** and **Breathe out…**.
- Calm circular progress indicator, high-contrast time remaining label.
- Visible **Skip** control at bottom.

### E. Positive feedback

- Kivi displays a small smile/closed eyes; optional few decorative leaves.
- Heading: **Great choice!**
- Explanation: **You chose to stay focused.**
- Show time saved only when it is honestly calculated; otherwise omit the metric.
- One clear primary CTA: **Continue**.

## 8. Content & interaction principles

- Speak like a helpful companion: short, supportive, never moralizing.
- Avoid “You failed,” “Bad habit,” “Don't be lazy,” or exaggerated claims.
- Make the main action understandable within 1–2 seconds.
- Prefer a small set of meaningful animations over elaborate transitions.
- Reserve success celebrations for real user choices, not every tap.
- Use actual app names and genuine usage statistics when available.

## 9. Implementation tokens

```css
:root {
  --kivi-primary: #2A7E3B;
  --kivi-accent: #46A758;
  --kivi-secondary: #8FCF94;
  --kivi-border: #B6E4B9;
  --kivi-surface: #E9F6E9;
  --kivi-background: #F5FBF5;
  --kivi-white: #FFFFFF;
  --kivi-text: #203C25;
  --kivi-text-secondary: #55765D;
  --kivi-radius-card: 24px;
  --kivi-radius-button: 18px;
  --kivi-space-screen: 20px;
}
```

## 10. Do / don't

| Do | Don't |
|---|---|
| Keep the interface  mostly white and light green | Fill every card with saturated green |
| Keep Kivi's two eyes like a pause icon | Add realistic facial features that obscure the symbol |
| Use solid HEX colors | Use `opacity`, alpha colors, translucent overlays or glassmorphism |
| Animate Kivi subtly and with purpose | Create distracting continuous movement |
| Show short, supportive microcopy | Guilt-trip the user about screen time |
| Keep both “Stay focused” and “Open anyway” accessible | Hide the exit option |
| Use measured user data | Invent improvements or time saved |

## 11. Assets to prepare

- `kivi-app-icon.png` — 1024 × 1024 px, final square artwork, no baked-in rounded corners.
- `kivi-mascot.svg` — separate body, eyes and leaf paths for animation.
- `kivi-idle`, `kivi-blink`, `kivi-look-left`, `kivi-look-right`, `kivi-happy` — reusable animation states.
- Optional large onboarding composition with Kivi and organic green ground shapes.

**Design rule of thumb:** if a screen looks busy, remove decoration before adding more shades of green.
