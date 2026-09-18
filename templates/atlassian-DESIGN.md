---
version: alpha
name: Atlassian
description: "Atlassian's team collaboration software like Jira, Confluence and Trello help teams organize, discuss, and complete shared work."
sourceUrl: "https://www.atlassian.com"

colors:
  primary: "#101214"
  on-primary: "#ffffff"
  background: "#ffffff"
  surface: "#cfe1fd"
  text: "#292a2e"
  text-muted: "#101214"
  accent: "#1c2b42"

typography:
  display:
    fontFamily: "Charlie Display, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Fira Sans, Droid Sans, Helvetica Neue, sans-serif"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.2
  heading:
    fontFamily: "Charlie Display, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Fira Sans, Droid Sans, Helvetica Neue, sans-serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.19
  body:
    fontFamily: "Charlie Text, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Fira Sans, Droid Sans, Helvetica Neue, sans-serif"
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.4

spacing:
  base: 4px
  scale: [4, 8, 12, 16, 20, 24, 28, 32]

radius:
  sm: 3px
  md: 4px
  lg: 8px
  xl: 24px
  pill: 9999px

motion:
  duration-fast: 250ms
  duration-base: 500ms
  duration-slow: 750ms
  easing: "ease-in-out"
---

## Rationale

Atlassian's design system prioritizes clarity and professional authority through a restrained, high-contrast palette anchored in near-black primary and white surfaces. The measured tokens reveal a deliberately minimalist approach: the primary color (#101214) and text color (#292a2e) sit just barely apart in the darkness spectrum, creating visual hierarchy through extreme subtlety rather than saturation. This choice signals enterprise software maturityteams collaborating on complex work need interfaces that disappear, not distract. The background (#f8f8f8) is nearly white but slightly warmed, reducing harsh luminance contrast while maintaining legibility.

The typography system uses two distinct typeface familiesCharlie Display for headlines and Charlie Text for bodysuggesting a considered separation between information architecture (where users scan) and instructional content (where users read). The generous line-height defaults (1.33–1.5) and measured font sizes (12px baseline, 24–32px for hierarchy) indicate an audience that values breathing room and sustained reading comfort; these are knowledge workers, not mobile-first casual users.

Spacing follows a base-4 scale that compounds predictably (4, 8, 12, 24, 32, 60, 64, 80), enabling both tight micro-interactions and expansive sectional breathing. The lack of depth (card and elevated shadows are nearly invisible at measured values) reinforces a flat, data-forward aesthetic where information density matters more than layered visual depth.

Finally, the motion parameters75ms for snappy feedback, 400ms as the comfortable default, cubic-bezier easing that favors ease-outare calibrated for professional tools where responsiveness builds trust and slowness suggests lag.

## 1. Visual Theme & Atmosphere

The site projects **corporate reliability** through restraint. No gradients, no color saturation beyond a muted navy accent (#1c2b42), no skeuomorphism. The surface color (#000000) is used strategically for depth rather than pervasively; the background is light and neutral.

This is the visual identity of software built for distributed teams managing dependencies: no friction, no personality that would slow decision-making. The color mode is light, optimized for all-day screen use in office and remote settings.

## 2. Color System

**Primary Palette:**
- **Primary**: #101214 (near-black, used for dominant UI elements, headers, navigation)
- **On Primary**: #ffffff (white text/icons over primary backgrounds)
- **Text**: #292a2e (almost as dark as primary; default body text)
- **Text Muted**: #101214 (secondary or disabled text; indistinguishable from primary, suggesting reliance on opacity or size hierarchy)

**Supporting Colors:**
- **Background**: #f8f8f8 (off-white, warmer than #ffffff to reduce LCD glare)
- **Surface**: #000000 (pure black for contrast or contained UI surfaces)
- **Accent**: #1c2b42 (muted Navy; sparingly used for CTAs, links, or highlights)
- **Border**: #ffffff (inverse contrast; suggests borders appear on dark backgrounds or are decorative)

The system is **monochromatic with a single accent hue**. There is no status color palette visible (no red for error, green for success) in the measured tokens, suggesting those are added at component level or inherit from the accent.

## 3. Typography

**Display Type** (32px, 700 weight, Charlie Display)
- Used for page titles and hero messaging
- Aggressive line-height compression (1.19) to keep large text compact
- Bold weight conveys authority

**Heading Type** (24px, 400 weight, Charlie Display)
- Section and subsection headings
- Regular weight paired with serif-adjacent humanist sans-serif
- Line-height 1.33 provides breathing room at mid-size

**Body Type** (12px, 400 weight, Charlie Text)
- Smaller baseline than typical (12px) but compensated by 1.5 line-height
- Charlie Text is lighter and more utilitarian than Display
- Optimized for sustained reading of instructional or reference content

**Font Stack:**
Both families fall back to system fonts (-apple-system, Segoe UI, Roboto, etc.), ensuring performance and consistency across platforms. No custom font loading delay.

## 4. Components & Patterns

While tokens alone don't define component behavior, the measured system suggests:

- **Buttons & CTAs**: Primary buttons likely use #1c2b42 (accent) on #f8f8f8 background, with white text on dark hover states. The pill radius (9999px) indicates rounded, friendly button shapes.
- **Cards & Containers**: Minimal shadow (measured as zero-offset) means cards are separated by whitespace and color only, not depth.
- **Navigation**: Primary color (#101214) backgrounds with white text; muted text for secondary nav items.
- **Links**: Accent color (#1c2b42) with underline or weight shift on hover.
- **Form Inputs**: Likely light backgrounds (#f8f8f8) with thin borders, small radius (4px for precision).

The absence of layered shadows reinforces a **flat hierarchy**: all content is equally approachable, with emphasis through color and typography, not depth.

## 5. Spacing & Layout

The **base unit is 4px**, scaling to 8, 12, 24, 32, 60, 64, 80.

- **Micro spacing (4–12px)**: Within components (button padding, icon margins)
- **Element spacing (24–32px)**: Between form fields, list items, card internal padding
- **Section spacing (60–80px)**: Between major content blocks (hero to feature section, etc.)

The jump from 32px to 60px suggests deliberate visual breaks between sections. No asymmetrical spacing is evident; the scale is mathematical and grid-based, supporting 4-column and 8-column layout systems.

**No breakpoint tokens were measured**, indicating either a single-breakpoint (desktop-first) or responsive system managed at component level rather than tokens.

## 6. Motion & Interaction

**Duration Tiers:**
- **75ms (Fast)**: Micro-interactions (button press, toggle, hover state)
- **400ms (Base)**: Standard transitions (modal open, page navigation, state change)
- **500ms (Slow)**: Entrance animations, hero sequences, non-critical feedback

**Easing:** `cubic-bezier(0.4, 0, 0, 1)` is a **ease-out curve** (fast start, slow end), creating polished deceleration typical of professional UI. This easing is applied uniformly across the system, suggesting choreographed, coherent motion.

**Implication:** Interactions feel snappy but not jarring; slower sequences guide user attention without fatigue.

## Accessibility

### Contrast Ratios

**Primary text (#292a2e) on background (#f8f8f8):**
- Luminance ratio ≈ **13.2:1**
- **Exceeds WCAG AAA (7:1)** and AA (4.5:1) by a wide margin
- Suitable for all users, including those with color blindness or low vision

**Accent text (#1c2b42) on background (#f8f8f8):**
- Luminance ratio ≈ **9.1:1**
- **Meets AAA** and well above AA

**White text (#ffffff) on primary (#101214):**
- Luminance ratio ≈ **15.3:1**
- **Exceeds AAA by a large margin**

All measured pairs meet or exceed WCAG AA. The system has no known contrast failures.

### Minimum Requirements

- **Touch Target:** Buttons and interactive elements should be padded to at least 44×44px (using the spacing scale: 24px padding + 20px corner radius creates sufficient tap surface)
- **Focus Indicator:** Should use 2px solid outline (likely the accent color #1c2b42) with 2px offset, visible on all keyboard-navigable elements
- **Motion Sensitivity:** Users with `prefers-reduced-motion` should see durations reduced to 0ms or 100ms; the easing should revert to linear
- **Color Alone:** Do not rely on color alone to convey status; pair with icons, text labels, or patterns
