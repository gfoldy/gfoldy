# Feeds &amp; Speeds

A dependency-free, mobile-first feeds &amp; speeds calculator for milling, routing
and drilling. Pick the **machine** you have, the **tool** you're running and the
**material** you're cutting, and it returns spindle speed, feed rate, depth/width
of cut and material removal rate — updating live as you tweak the inputs.

Open `index.html` in any browser. No build step, no server, no dependencies.
State (your last inputs) is saved in `localStorage`, and it works offline.

## What it calculates

| Output | Formula |
| --- | --- |
| Spindle speed (RPM) | `SFM × 12 / (π × D)` — clamped to the machine's spindle range |
| Feed rate | milling: `RPM × chip load × flutes` · drilling: `RPM × feed/rev` |
| Depth of cut (Ap) | fraction of tool Ø, by material class × machine rigidity × aggressiveness |
| Width of cut (Ae) | radial stepover, same scaling; full Ø for slotting |
| Material removal rate | `Ap × Ae × feed` |

Extras:

- **Machine presets** (hobby router → industrial VMC) set the spindle RPM limits
  and a rigidity factor that scales how deep a cut it recommends. When the ideal
  speed falls outside the spindle range, RPM is capped/floored and you're warned.
- **Aggressiveness** (Conservative / Nominal / Aggressive) moves you through the
  surface-speed range and scales chip load and depth of cut.
- **Radial chip thinning** raises the programmed feed for light stepovers, the
  way real CAM does.
- **Unit toggle** — inch or mm — converts inputs and all outputs.
- **Contextual warnings** — e.g. HSS in hard materials, too many flutes for
  gummy aluminium, fragile small-diameter tools.

## Files

- `index.html` — markup / form
- `styles.css` — dark, mobile-first styling
- `data.js` — machines, tools, materials and the reference tables
- `calc.js` — pure calculation engine (no DOM; usable from Node for tests)
- `app.js` — form wiring, rendering and persistence

## A note on accuracy

Every number is a conservative **starting point** compiled from common machinist
references. Real feeds &amp; speeds depend on tool coating, stick-out, work holding,
coolant and the condition of your machine. Start on the safe side, trust your
ears and your chips, and defer to the tool manufacturer's data sheet.
