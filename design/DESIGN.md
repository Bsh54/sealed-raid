---
name: Sealed Raid
colors:
  surface: '#111318'
  surface-dim: '#111318'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#1a1c20'
  surface-container: '#1e2024'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#ffc384'
  on-secondary: '#482900'
  secondary-container: '#fe9d00'
  on-secondary-container: '#663c00'
  tertiary: '#f4f6ff'
  on-tertiary: '#263142'
  tertiary-container: '#cfdaf1'
  on-tertiary-container: '#545f73'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#ffdcbb'
  secondary-fixed-dim: '#ffb869'
  on-secondary-fixed: '#2c1700'
  on-secondary-fixed-variant: '#673d00'
  tertiary-fixed: '#d8e3fa'
  tertiary-fixed-dim: '#bcc7dd'
  on-tertiary-fixed: '#111c2c'
  on-tertiary-fixed-variant: '#3c475a'
  background: '#111318'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.2'
  data-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.1em
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 48px
  grid-cell: 64px
---

## Brand & Style

The design system is a "Cyber-Noir" framework optimized for high-stakes blockchain interaction. It evokes the feeling of an underground hacking terminal merged with elite financial surveillance software. The interface is confidential, sleek, and high-contrast, prioritizing "information density" and visual tension.

The design style is **Glassmorphic-Brutalism**. It utilizes the translucency and background blurs of glassmorphism to suggest depth in a digital void, while borrowing the structural rigidity and heavy borders of brutalism to convey security and permanence. Every element should feel like a piece of encrypted data being decrypted in real-time.

**Visual Signifiers:**
- **Encrypted States:** Use "redacted" blocks (solid primary color rectangles) that transition into legible text.
- **Scanning Effects:** A subtle horizontal scanline moving vertically across high-emphasis components.
- **Data-Linkage:** Thin, 1px lines connecting related UI elements to simulate a neural network or circuit board.

## Colors

This design system is strictly **Dark Mode**. The palette is designed for maximum legibility of critical data against a deep, infinite void.

- **Background (Void):** `#0A0C10` - The absolute base layer.
- **Surface (Terminal):** `#14181E` - Used for containers, cards, and modal backdrops.
- **SHARD (Primary):** `#00F0FF` - Electric cyan. Used for treasures, progress, and successful actions. It should often carry a `0 0 10px` outer glow.
- **ICE (Secondary):** `#FF9D00` - Cautionary orange. Used for traps, hazards, and critical warnings.
- **VOID (Tertiary):** `#4A5568` - Muted slate. Used for disabled states, secondary metadata, and non-interactive grid lines.

## Typography

Typography is used as a functional tool for data differentiation. 

1. **Inter** is the structural typeface, used for all UI instructions, headers, and narrative text. It should feel sharp and "un-designed" to maintain a professional, surveillance-tool aesthetic.
2. **JetBrains Mono** is the "Data Layer" typeface. It is used exclusively for blockchain addresses, scores, timers, and "system output" messages. 

All headings should be tight and impactful. Data labels should always use the `label-caps` style to differentiate metadata from actual values.

## Layout & Spacing

The layout is governed by a **Strict Modular Grid**. Everything is built on a 4px baseline to ensure mathematical precision.

- **Grid Cells:** The core gameplay area uses a fixed square grid. Cells are 64px on desktop and scale down to 48px on mobile.
- **The Sidebar/Console:** Information is grouped into "Terminal Blocks" that dock to the edges of the screen.
- **Background Pattern:** A subtle 32px repeating dot or square grid pattern must be visible in the background at 5% opacity to reinforce the "digital coordinate" feel.
- **Margins:** Use wide margins (`48px`+) on desktop to create a sense of focused isolation in the center of the screen.

## Elevation & Depth

This design system eschews traditional shadows in favor of **Light Emission and Translucency**.

- **Z-Axis Hierarchy:** Depth is created by layering semi-transparent surfaces (`rgba(20, 24, 30, 0.8)`) with `backdrop-filter: blur(12px)`.
- **Glows:** Higher elevation elements do not cast shadows; they emit light. Use subtle outer glows (`box-shadow: 0 0 15px rgba(0, 240, 255, 0.3)`) for active or hovered components.
- **Borders:** Surfaces are defined by 1px solid borders. Use the `VOID` color for inactive surfaces and the `SHARD` color for active/focused surfaces.

## Shapes

The shape language is **Aggressively Sharp**. 

- **Corner Radius:** All UI elements have 0px roundedness. Sharp corners reinforce the "unfiltered" and "technical" nature of the blockchain environment.
- **Angled Accents:** Use 45-degree clipped corners (dog-ears) for primary action buttons and "Redacted" tags to simulate document folders or military hardware.
- **The Seal:** Interactive elements may feature a 1px border that is interrupted by small gaps at the corners to look like a "Digital Seal" or stencil.

## Components

### Grid Cells
- **Sealed:** Solid `surface_color` with a low-opacity `VOID` 1px border. Center icon is a blurred "Encrypted" glyph.
- **Raided:** Background becomes transparent; border matches the result (Cyan for Shard, Orange for Ice). 
- **Hover:** The border glows primary cyan, and a subtle "targeting crosshair" appears in the corners.

### Status Bars
- **Player Health/Score:** Use segmented bars (e.g., 10 distinct blocks) rather than a fluid fill. This mimics retro terminal loading sequences. Empty segments should be `tertiary_color` at 20% opacity.

### Terminal Buttons
- **Default:** Transparent background, 1px Primary Cyan border, JetBrains Mono text.
- **Active:** Background fills with Primary Cyan (100%), text switches to Neutral Black (#0A0C10).
- **Hover:** Adds a "glitch" animation where a ghost image of the button offsets by 2px for 100ms.

### Interactive Cards (Match Previews)
- Use the Glassmorphism effect. Title in Inter Bold, Data points in JetBrains Mono. Include a small "Access Granted" or "Scanning..." status label in the top right.

### Input Fields
- Fields are underlined only, not fully boxed. When focused, the underline pulses and a vertical "Command Line" cursor blinks at the end of the text string.