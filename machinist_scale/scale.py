"""Parametric 6" machinist scale (4R graduations), built with build123d.

Front: 1/8" (bottom edge) and 1/16" (top edge).
Back:  1/32" (bottom edge) and 1/64" (top edge), numbered every 1/8".
All dimensions in inches; exported as STEP/STL in millimetres.
"""
from build123d import *

IN = 25.4

# ---- Parameters (inches) ----
LENGTH = 6.0
WIDTH = 0.75
THICK = 3 / 64
DEPTH = 0.003          # engraving depth
LINE_W = 0.004         # graduation line width
INCH_LEN = 0.20        # line lengths by level
HALF_LEN = 0.15
QTR_LEN = 0.12
EIGHTH_LEN = 0.095
SIXTEENTH_LEN = 0.07
THIRTYSECOND_LEN = 0.055
SIXTYFOURTH_LEN = 0.04
NUM_H = 0.11           # inch numeral height
SUB_H = 0.055          # small numeral height
FONT = "DejaVu Sans"


def line_len(i, div):
    """Length of the i-th graduation on a scale with `div` divisions per inch."""
    for d, L in ((1, INCH_LEN), (2, HALF_LEN), (4, QTR_LEN), (8, EIGHTH_LEN),
                 (16, SIXTEENTH_LEN), (32, THIRTYSECOND_LEN)):
        if d <= div and i % (div // d) == 0:
            return L
    return SIXTYFOURTH_LEN


def edge_scale(div, top, sub_numbers=False):
    """2D faces for one graduated edge. top=True: lines hang from the top edge."""
    faces = []
    sgn, y0 = (-1, WIDTH) if top else (1, 0.0)
    for i in range(1, int(LENGTH * div)):
        x = i / div
        L = line_len(i, div)
        faces.append(Pos(x, y0 + sgn * L / 2) * Rectangle(LINE_W, L))
        if i % div == 0:
            y = y0 + sgn * (INCH_LEN + 0.02 + NUM_H / 2)
            faces.append(Pos(x, y) * Text(str(i // div), NUM_H, font=FONT))
        elif sub_numbers and i % (div // 8) == 0:
            y = y0 + sgn * (EIGHTH_LEN + 0.015 + SUB_H / 2)
            # Sit beside the line so longer 1/4 and 1/2 lines don't cross it
            faces.append(Pos(x + 0.012, y) * Text(str(i % div), SUB_H, font=FONT,
                                                  align=(Align.MIN, Align.CENTER)))
    # Graduation label near the zero end
    y = y0 + sgn * (INCH_LEN + 0.02 + SUB_H / 2)
    faces.append(Pos(0.09, y) * Text(str(div), SUB_H, font=FONT))
    return faces


def side(scales):
    faces = []
    for div, top, sub in scales:
        faces += edge_scale(div, top, sub)
    return Sketch() + faces


front = side([(16, True, False), (8, False, False)])
back = side([(64, True, True), (32, False, True)])

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
    # 2D artwork for previews
    for name, sk in (("front", front), ("back", back)):
        svg = ExportSVG(unit=Unit.IN, margin=0.05)
        svg.add_layer("blank", fill_color=(205, 208, 212), line_color=(90, 90, 90))
        svg.add_layer("marks", fill_color=(20, 20, 20), line_color=None)
        svg.add_shape(Rectangle(LENGTH, WIDTH, align=Align.MIN), layer="blank")
        svg.add_shape(sk.faces(), layer="marks")
        svg.write(f"{out}/{name}_artwork.svg")
    print("volume mm3:", round(rule.volume, 2), "valid:", rule.is_valid)
