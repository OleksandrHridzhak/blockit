# Monochrome Editorial Mobile — Blockit

## Applied

Canvas/surfaces #121212; foreground #FAFAFA; secondary #8E8E8E; separators #2E2E2E. No accent colors, shadows, rounded panels or pills. The only rounded OS elements are native switches and controls managed by iOS.

Headings are regular weight, 48/51 for the home title, 24/29 for section headings. Tracking -1.7 / -0.5. Metadata uses uppercase Geist SemiBold, 11/17, tracking 2.2. Body is 16/25 to keep Ukrainian instructions readable; this intentionally exceeds the reference's 14 px body. Controls are at least 52 pt tall. Content remains scrollable and scales with system text size.

Instrument Sans is embedded locally for numerals and Latin display text. Its font metadata and glyph map have no Cyrillic. Ukrainian headings therefore use the paired Geist, which contains Ukrainian characters, including Є, Ї, І and Ґ. Static font instances have distinct internal names to avoid registration collisions on iOS. Font and icon licenses are bundled alongside assets.

Phosphor light icons; filled variant only for the selected bottom tab. Fixed bottom navigation has a 1 px separator and no selected pill. Native Swift shield uses a dark background, white action and monochrome icon; iOS controls its corner shapes and text typography.

## Verification

Typecheck, lint and web export are required. Existing core tests verify the unchanged blocking logic; actual shield appearance and custom font registration on iPhone still need a native build. Browser visual QA was unavailable in this session: in-app browser timed out on localhost, and native screenshot targeting returned the wrong foreground window. No screenshot of the redesigned app is claimed.
