---
name: SkinSense
colors:
  surface: '#f6faff'
  surface-dim: '#b5dfff'
  surface-bright: '#f6faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eaf5ff'
  surface-container: '#dff0ff'
  surface-container-high: '#d3ebff'
  surface-container-highest: '#c7e7ff'
  on-surface: '#001e2e'
  on-surface-variant: '#3f4948'
  inverse-surface: '#00344c'
  inverse-on-surface: '#e5f2ff'
  outline: '#6f7979'
  outline-variant: '#bec9c8'
  surface-tint: '#0e6969'
  primary: '#016464'
  on-primary: '#ffffff'
  primary-container: '#2d7d7d'
  on-primary-container: '#dafffe'
  inverse-primary: '#88d3d3'
  secondary: '#356668'
  on-secondary: '#ffffff'
  secondary-container: '#b9ecee'
  on-secondary-container: '#3c6c6e'
  tertiary: '#535b53'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b746a'
  on-tertiary-container: '#f1faee'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a4f0ef'
  primary-fixed-dim: '#88d3d3'
  on-primary-fixed: '#002020'
  on-primary-fixed-variant: '#004f50'
  secondary-fixed: '#b9ecee'
  secondary-fixed-dim: '#9ecfd1'
  on-secondary-fixed: '#002021'
  on-secondary-fixed-variant: '#1a4e50'
  tertiary-fixed: '#dce5d9'
  tertiary-fixed-dim: '#c0c9be'
  on-tertiary-fixed: '#161d16'
  on-tertiary-fixed-variant: '#404940'
  background: '#f6faff'
  on-background: '#001e2e'
  surface-variant: '#c7e7ff'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
  gutter: 16px
---

## Brand & Style

The brand identity centers on "Clinical Calm"—a bridge between professional dermatology and accessible daily self-care. The target audience includes individuals seeking structured skincare routines and skin health monitoring. The emotional response is one of safety, clarity, and gentle guidance.

The design system adopts a **Minimalist / Modern** style with heavy influence from **Soft-Clinical** aesthetics. It prioritizes breathable whitespace to reduce cognitive load, utilizing subtle depth and high-quality typography to establish trust. The visual language avoids the sterile coldness of traditional medical apps, opting instead for a welcoming, high-end wellness atmosphere.

## Colors

The palette is designed to feel refreshing and restorative. 
- **Primary (Teal):** Used for primary actions, branding, and active states. It suggests health and professional stability.
- **Secondary (Pastel Blue):** Used for decorative elements, secondary buttons, and background accents to maintain a soft visual flow.
- **Tertiary (Warm Neutral):** Acts as the primary background surface color to reduce eye strain compared to pure white.
- **Neutral (Slate Blue):** Reserved for text and iconography to ensure high legibility while remaining softer than pure black.

Functional colors for "Success" (Sage Green), "Warning" (Soft Gold), and "Error" (Coral) should be desaturated to fit the calming aesthetic.

## Typography

This design system utilizes a dual-font strategy. **Plus Jakarta Sans** provides a friendly, modern character for headlines, while **Inter** ensures maximum readability for clinical data and body descriptions.

All Indonesian labels (e.g., *Riwayat Kulit*, *Jadwal Harian*) should use `headline-sm` or `label-md`. For long-form educational content regarding skin conditions, `body-lg` is preferred to maintain a premium, editorial feel. Letter spacing is kept tight for headlines to maintain a modern look and slightly open for body text to improve scanning.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a focus on generous vertical breathing room. 
- **Mobile:** 4-column grid with 24px side margins.
- **Desktop/Tablet:** 12-column grid centered at a max-width of 1200px.

Spacing is based on an 8px root scale. For skincare apps, "negative space" is a functional element used to separate different routine steps or product categories without needing heavy dividers. Use `stack-lg` to separate major content sections and `stack-sm` for related internal components.

## Elevation & Depth

To maintain a "trustworthy" and "clean" feel, this design system avoids heavy drop shadows. Instead, it uses **Ambient Shadows** and **Tonal Layers**.

1.  **Level 0 (Surface):** The tertiary warm neutral background.
2.  **Level 1 (Cards):** Pure white surfaces with a very soft, diffused shadow (`Y: 4, Blur: 20, Color: rgba(45, 125, 125, 0.05)`).
3.  **Level 2 (Interactive):** Slightly higher elevation for active buttons or modals, using a secondary tint in the shadow to maintain color harmony.

Borders are rarely used; where necessary, they are 1px solid lines in a very light version of the primary teal (opacity 10-15%).

## Shapes

The shape language is defined by "Organic Geometry." Large, pill-shaped containers and highly rounded corners (24px to 32px) are used to mimic the soft edges found in high-end cosmetic packaging and to evoke a sense of comfort.

- **Primary Buttons:** Fully pill-shaped.
- **Information Cards:** 24px (rounded-lg).
- **Image Containers:** 32px (rounded-xl) to frame skin photography softly.
- **Selection Chips:** Fully pill-shaped.

## Components

- **Buttons:** Primary buttons use a solid Teal (`primary`) with white text. Secondary buttons use a light Blue (`secondary`) background with Teal text. All are pill-shaped.
- **Input Fields:** Use a subtle neutral fill instead of a heavy border. Labels like *Nama Lengkap* or *Keluhan Kulit* are placed above the field in `label-md`.
- **Cards (Kartu Informasi):** White background, 24px radius, soft shadow. Used for "Tips Harian" or "Analisis Kulit."
- **Chips (Kategori):** Used for skin types (*Berminyak*, *Kering*, *Sensitif*). Use a soft teal background when selected and a warm neutral when unselected.
- **Progress Trackers:** Vertical lines for skincare routines (*Pagi*, *Siang*, *Malam*) should use soft rounded dots and thin teal lines.
- **Lists:** Clean rows with 16px vertical padding, separated by soft 1px lines or simply by whitespace.
- **Modals:** Bottom-sheets are preferred for mobile to maintain the "approachable" and "reachable" vibe, featuring a prominent 4px "handle" bar at the top.