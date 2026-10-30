# Machining the 6" scale in Fusion on a Makera Z1

The plan: engrave the front, cut both ends to length, flip the bar, then
engrave the back using the finished zero end as its reference.

## Files

| File | Use |
|---|---|
| `scale_front_engrave.dxf` | Front toolpaths: 1/16" top edge, 1/8" bottom edge. |
| `scale_back_engrave.dxf` | Back toolpaths: 1/64" top edge, 1/32" bottom edge. |
| `machinist_scale_6in.step` | Finished part, for reference and checking. |
| `scale.py` | Regenerates everything. Edit the parameters at the top. |

The DXFs are in **inches**. Each one is drawn as you see that face when it is
up on the machine, with the origin at the **zero-end, bottom-edge corner**.
The `OUTLINE` layer is the 6" × 0.75" part. The `ENGRAVE` layer has the
single-line centerlines to Trace. Every mark is a single line, including the
numbers, which use a single-stroke font. Graduations run 0.01" past the edge,
so the tool enters and leaves off the part.

## Stock and tools

- **Stock:** 1/8" × 3/4" 6061 aluminum flat bar, about 7" long. The model
  is 1/8" thick to match it. Change `THICK` in `scale.py` if you use other
  stock.
- **Engraving bit:** 30° V-bit with a 0.1 mm tip. At 0.003" deep it cuts
  a line about 0.005" wide (`LINE_W` in the script).
- **End cuts:** a 1/8" flat endmill (single flute is best for aluminum).
- **Workholding:** blue painter's tape plus CA glue, or good double-sided
  tape, on a flat spoilboard. Keep the bar flat. A 0.003" engraving shows
  any rocking or bow as uneven line widths.

Reviews put the Z1 spindle at 150 W and 13,000 RPM, and say it is underpowered
for heavy cuts in aluminum. These cuts are very light, but keep them that way.

## Fusion: build the CAM geometry (once per side)

1. Start a new design and set the units to **inches**.
2. Use **Insert → Insert DXF**. Pick the side's DXF, put it on the **XY plane**,
   and keep it at the origin.
3. **Extrude** the OUTLINE rectangle **0.125" in the −Z direction**. The top
   face is then at Z0, and the DXF sketch lies on that top face.

The front and back are set up the same way, so one design per side keeps the
setup simple.

## Side 1: front

**Setup**
- **WCS:** origin at the top, bottom-left corner of the model, which is the
  zero end and bottom edge. X runs along the length.
- **Stock:** add about 0.25" on −X and about 0.75" on +X, so the ends can be
  cut off cleanly.
- **On the machine:** tape the bar down with its bottom long edge square to
  X. Set X0 about 0.25" in from the left end of the bar, Y0 on the bottom
  long edge (probe it), and Z0 on the top surface.

**Op 1: Trace (engrave)**
- **Geometry:** the ENGRAVE sketch curves. Select them by window, or use
  chain selection on the sketch.
- **Heights:** Bottom = the selected contour, with an **axial offset of
  −0.003"**.
- **Feeds:** 13,000 RPM, 12 ipm (300 mm/min) cutting feed, 4 ipm plunge. One
  pass is fine. For a cleaner bottom, use multiple depths: 2 passes of 0.0015".
- **Retract:** a low clearance height (about 0.04") saves a lot of time over
  thousands of short moves.

**Op 2: 2D Contour (cut to length)**
- **Geometry:** the two **short end edges only** (x = 0 and x = 6), as open
  contours. Put the tool on the **outside** of each end, so the material
  removed is the scrap.
- **Depth:** 0.005" below the bottom of the bar.
- **Passes:** multiple depths with a max stepdown of 0.010". Leave 0.003"
  stock, then take one finishing pass. Starting feeds: 13,000 RPM, 10 ipm,
  2 ipm plunge, with a drop of WD-40 or alcohol on the cut.
- The **x = 0 end is the zero reference** for the whole rule, so make it a
  clean, square cut.

## Side 2: back

- **Flip:** roll the bar over **along its long axis**, so the zero end stays
  on the left. Do not swap the ends. Tape it down again.
- **Origin:** probe **X0 on the cut zero-end face**, Y0 on the bottom long edge
  (it was the top edge on side 1), and Z0 on the top surface.
- **Engrave:** use the same Trace operation with the same tool, feeds and
  depth, but on `scale_back_engrave.dxf`. Skip the contour; the ends are
  already cut.

A small error in the bar's width only shifts the marks along Y, so it does
not affect accuracy. Accuracy along the scale depends on the X0 probe on
the zero end.

## Post-processing

Post the program with the Makera post processor for the Z1, from Makera's
site or MakeraStudio. I could not confirm its exact name or download link,
so use whatever Makera lists for the Z1.

The back side has about 2,800 separate short paths. Expect it to run several
times longer than the front, mostly from retract moves.

## Before cutting the real part

- Run the front Trace on a scrap of the same bar first. Check the line width
  and depth, then adjust the axial offset (`DEPTH`) to taste.
- Deburr lightly with a fine stone or 600-grit paper on a flat surface. Raised
  burrs at 1/64" spacing will look like extra lines.
