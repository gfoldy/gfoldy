"""Parametric 6" machinist scale (4R graduations), built with build123d.

Front: 1/8" (bottom edge) and 1/16" (top edge).
Back:  1/32" (bottom edge) and 1/64" (top edge), numbered every 1/8".

Every mark is a single-stroke centreline, so the same paths drive both the
3D model (stroked to the engraved width) and the DXFs used for CAM with a
V-bit (Fusion "Trace"). All dimensions in inches; STEP/STL are exported in
millimetres, DXFs in inches.
"""
import math

import ezdxf
from build123d import *
from HersheyFonts import HersheyFonts

IN = 25.4

# ---- Parameters (inches) ----
LENGTH = 6.0
WIDTH = 0.75
THICK = 1 / 8          # matches common 1/8" x 3/4" 6061 flat bar
DEPTH = 0.003          # engraving depth
LINE_W = 0.005         # engraved width (30 deg V-bit, 0.1 mm tip, at DEPTH)
INCH_LEN = 0.20        # line lengths by level
HALF_LEN = 0.15
QTR_LEN = 0.12
EIGHTH_LEN = 0.095
SIXTEENTH_LEN = 0.07
THIRTYSECOND_LEN = 0.055
SIXTYFOURTH_LEN = 0.04
NUM_H = 0.10           # inch numeral height
SUB_H = 0.05           # small numeral height

_font = HersheyFonts()
_font.load_default_font("futural")
_font.normalize_rendering(1)


def line_len(i, div):
    """Length of the i-th graduation on a scale with `div` divisions per inch."""
    for d, L in ((1, INCH_LEN), (2, HALF_LEN), (4, QTR_LEN), (8, EIGHTH_LEN),
                 (16, SIXTEENTH_LEN), (32, THIRTYSECOND_LEN)):
        if d <= div and i % (div // d) == 0:
            return L
    return SIXTYFOURTH_LEN


def text_paths(s, x, y, h, align="center"):
    """Single-stroke text as line segments, height h, vertically centred on y."""
    segs = list(_font.lines_for_text(s))
    xs = [p[0] for seg in segs for p in seg]
    ys = [p[1] for seg in segs for p in seg]
    k = h / (max(ys) - min(ys))
    x0 = x - (min(xs) if align == "left" else (min(xs) + max(xs)) / 2) * k
    y0 = y - (min(ys) + max(ys)) / 2 * k
    return [[(x0 + px * k, y0 + py * k) for px, py in seg] for seg in segs]


def edge_scale(div, top, sub_numbers=False):
    """Polylines for one graduated edge. top=True: lines hang from the top edge."""
    paths = []
    sgn, y0 = (-1, WIDTH) if top else (1, 0.0)
    for i in range(1, int(LENGTH * div)):
        x = i / div
        # Lines start just outside the edge so the cutter runs off the part
        paths.append([(x, y0 - sgn * 0.01), (x, y0 + sgn * line_len(i, div))])
        if i % div == 0:
            y = y0 + sgn * (INCH_LEN + 0.025 + NUM_H / 2)
            paths += text_paths(str(i // div), x, y, NUM_H)
        elif sub_numbers and i % (div // 8) == 0:
            # Sit beside the line so longer 1/4 and 1/2 lines don't cross it
            y = y0 + sgn * (EIGHTH_LEN + 0.02 + SUB_H / 2)
            paths += text_paths(str(i % div), x + 0.012, y, SUB_H, align="left")
    # Graduation label near the zero end
    y = y0 + sgn * (INCH_LEN + 0.025 + SUB_H / 2)
    paths += text_paths(str(div), 0.06, y, SUB_H, align="left")
    return paths


def stroke(paths, w):
    """Engraved footprint of the centrelines: round-ended strokes of width w."""
    faces = []
    for path in paths:
        for (x1, y1), (x2, y2) in zip(path, path[1:]):
            L = math.hypot(x2 - x1, y2 - y1)
            if L > 1e-6:
                ang = math.degrees(math.atan2(y2 - y1, x2 - x1))
                faces.append(Pos((x1 + x2) / 2, (y1 + y2) / 2) * Rot(0, 0, ang)
                             * Rectangle(L, w))
        faces += [Pos(x, y) * Circle(w / 2) for x, y in path]
    return Sketch() + faces


def write_dxf(paths, filename):
    doc = ezdxf.new(units=ezdxf.units.IN)
    msp = doc.modelspace()
    doc.layers.add("OUTLINE", color=8)
    doc.layers.add("ENGRAVE", color=1)
    msp.add_lwpolyline([(0, 0), (LENGTH, 0), (LENGTH, WIDTH), (0, WIDTH)],
                       close=True, dxfattribs={"layer": "OUTLINE"})
    for path in paths:
        msp.add_lwpolyline(path, dxfattribs={"layer": "ENGRAVE"})
    doc.saveas(filename)


front_paths = edge_scale(16, True) + edge_scale(8, False)
back_paths = edge_scale(64, True, True) + edge_scale(32, False, True)
front = stroke(front_paths, LINE_W)
back = stroke(back_paths, LINE_W)

blank = Pos(LENGTH / 2, WIDTH / 2, THICK / 2) * Box(LENGTH, WIDTH, THICK)
front_cut = Pos(0, 0, THICK - DEPTH) * extrude(front, DEPTH * 2)
# Back side: build on top, then flip about the rule's long axis so it reads
# correctly when the scale is turned over.
back_cut = Pos(0, 0, THICK - DEPTH) * extrude(back, DEPTH * 2)
back_cut = back_cut.rotate(Axis((0, WIDTH / 2, THICK / 2), (1, 0, 0)), 180)

rule = blank - front_cut - back_cut
rule = scale(rule, IN)

if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    export_step(rule, f"{out}/machinist_scale_6in.step")
    export_stl(rule, f"{out}/machinist_scale_6in.stl", tolerance=0.005)
    # DXFs are as seen from the side being cut, origin at the zero-end corner
    write_dxf(front_paths, f"{out}/scale_front_engrave.dxf")
    write_dxf(back_paths, f"{out}/scale_back_engrave.dxf")
    # 2D artwork for previews
    for name, sk in (("front", front), ("back", back)):
        svg = ExportSVG(unit=Unit.IN, margin=0.05)
        svg.add_layer("blank", fill_color=(205, 208, 212), line_color=(90, 90, 90))
        svg.add_layer("marks", fill_color=(20, 20, 20), line_color=None)
        svg.add_shape(Rectangle(LENGTH, WIDTH, align=Align.MIN), layer="blank")
        svg.add_shape(sk.faces(), layer="marks")
        svg.write(f"{out}/{name}_artwork.svg")
    print("volume mm3:", round(rule.volume, 2), "valid:", rule.is_valid)
