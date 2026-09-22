# Feeds & Speeds — feature roadmap

What's on the market (FSWizard, HSMAdvisor, G-Wizard, tool-maker web calcs)
mostly answers *"what RPM and feed?"* and stops there. Several paywall the good
parts. The opening below is to be **the calculator that knows your shop** —
machine-aware, tool-aware, and honest about the limits — and free/offline.

Legend: **✅ shipped** · **🔨 next** · **🌟 the differentiators** · **🔭 moonshots**

## Already in the engine ✅
- Surface-speed → RPM, chip-load → feed, drilling feed-per-rev.
- Depth/width of cut by material class, scaled by machine rigidity + aggressiveness.
- **Spindle-power / torque check** — warns when a cut exceeds your machine's hp.
- **Tool-deflection estimate** — cantilever-beam model from tool stick-out.
- Radial **chip thinning**; **adaptive/HSM** operation mode; MRR.
- Machine, tool and material presets; imperial/metric; contextual warnings.
- Your **tool crib** + **saved jobs**, on-device.

## Next, high-value 🔨
1. **G-code / CAM export.** Emit a ready-to-paste block (`S…`, `F…`, plus a
   comment header) and per-CAM presets (Fusion 360, Carbide Create, VCarve).
   Nobody wants to retype numbers.
2. **Surface-finish ↔ stepover (ball-nose).** Solve scallop height from stepover
   (and vice-versa) so a finish pass is "how smooth do you want it?" not a guess.
3. **Tapping & threadmilling.** Tap drill sizes, pitch-locked feed, threadmill
   passes — a common gap in free tools.
4. **Turning / lathe mode.** Constant surface speed, feed-per-rev, DOC by insert.
5. **Peck-drill cycle helper.** Peck depths, retract, and a dwell suggestion by
   depth-to-diameter ratio.
6. **"Rigidity reality" slider.** One control for setup stiffness (vise vs. long
   reach vs. thin stock) that scales DOC — teaches *why*, not just *what*.

## The differentiators 🌟
7. **Chatter detection by ear.** Use the phone mic during a cut, FFT the audio,
   find the chatter frequency, and suggest an RPM that dodges it (stability-lobe
   idea, made approachable). This is the feature no free app has and every
   machinist would show their friends.
8. **"What actually worked" logger + community data.** After a cut, log the
   result (good / rubbing / chatter / broke) with an optional **photo of the
   chips**. Over time the app tunes *your* starting points, and — opt-in —
   aggregates anonymized results into community-verified feeds & speeds per
   machine + tool + material. A dataset like that compounds and can't be copied.
9. **Tool-life & cost estimate.** Taylor tool-life curve → "this pushes the tool
   ~2× harder, ~40% shorter life." Show cycle time and $ per part so hobby vs.
   production users can trade speed against tooling cost.
10. **Snap-a-tool onboarding.** OCR a tool label / catalog number (or scan a
    barcode) to auto-fill diameter, flutes and coating into the crib.
11. **Machine profiles that matter.** Real spindle power/torque *curves* (power
    falls off at low RPM on belt-drive spindles), max feed, and rigidity — so a
    Shapeoko and a Tormach get genuinely different, trustworthy numbers.

## Moonshots 🔭
12. **Live G-code / job co-pilot.** Paste a program; flag any move whose implied
    engagement blows the power or deflection budget on the selected machine.
13. **Coolant & heat guidance** per material/coating (flood, mist, air, dry).
14. **Apple Watch tap-through** at the machine, and Siri/voice ("feeds for a
    quarter-inch carbide in 6061") for greasy-handed lookups.
15. **Shareable shop packs.** Export/import your machines + tool crib as a file
    so a shop or a class starts from the same tuned library.

## Why this wins
- **Machine-aware, not chart-aware** (#7, #9, #11) — the numbers are trustworthy
  because they respect *your* spindle and *your* setup.
- **It learns** (#8) — a community "what worked" dataset gets better with use and
  is a moat competitors can't just copy.
- **Free, offline, no login** where rivals paywall — the reason people switch and
  tell a friend.
