"""Parametric full cage for the Sony ZV-E10, made from flat aluminium plates.

Parts (all cut flat on a desktop CNC, then screwed together):
  base     - camera plate with 1/4"-20 camera-screw slot and battery/SD cutout
  upright  - grip-side plate, rests on the base
  top      - top bar along the back of the camera, with two cold shoe channels
  shoe_cap - thin plate screwed onto the top bar to form the cold shoe rails

The left (screen hinge / ports) side is left open.

Coordinates (mm): X along the camera width, 0 at the screen-hinge end and
+X toward the grip. Y is depth, 0 at the back of the LCD and +Y toward the
lens. Z is up, 0 at the camera's bottom face (top of the base plate).

Values marked MEASURE are estimates. Check them with calipers on your
camera before cutting metal.
"""
from build123d import *

# ---- Camera (Sony spec: 115.2 x 64.2 x 44.8 mm, grip to monitor) ----
CAM_W = 115.2
CAM_H = 64.2
GRIP_D = 44.8          # back of LCD to front of grip
BODY_D = 34.0          # MEASURE: back of LCD to front of body (not grip)
TRIPOD_X = 44.0        # MEASURE: tripod socket centre from screen-hinge end
TRIPOD_Y = 17.0        # MEASURE: tripod socket centre from back of LCD
BATT_X = (76.0, 112.0) # MEASURE: battery/SD door extent along X
BATT_Y = (4.0, 32.0)   # MEASURE: battery/SD door extent along Y
LUG_Z = (30.0, 58.0)   # MEASURE: grip-side strap lug height range to clear
HOTSHOE_X = 44.0       # MEASURE: hot shoe centre; top bar stays clear of it
LENS_CLEAR_X = 72.0    # MEASURE: from here to the grip end, nothing hangs below
                       # the body in front of BASE_D, so the base can run deeper

# ---- Cage ----
PT = 6.35              # main plate thickness (1/4" 6061)
CAP_T = 1.6            # cold shoe cap plate thickness (1/16" sheet)
GAP = 0.5              # clearance between grip end and upright
TOP_GAP = 10.0         # clearance between camera top and top bar
BASE_D = BODY_D - 2    # base stops short of the lens
GRIP_BASE_D = GRIP_D - 2  # base depth under the grip
RAIL = 5.0             # minimum solid rail either side of the battery cutout
TOP_D = 25.0           # top bar depth, along the back of the camera
TOP_X0 = HOTSHOE_X + 16  # top bar's free (left) end
R = 3.0                # outer corner radius

UP_X = CAM_W + GAP     # upright inner face
UP_H = CAM_H + TOP_GAP

# Hole sizes (tap drill sizes; tap by hand after machining)
TAP_14_20 = 5.1        # 1/4"-20 tap drill (#7)
CLR_14 = 6.6           # 1/4" clearance
TAP_M4 = 3.3
CLR_M4 = 4.5
TAP_M3 = 2.5
CLR_M3 = 3.4
# Counterbores on the base underside so it sits flat on a tripod plate
CB_14_W, CB_14_D = 11.8, 3.6   # 1/4"-20 button head (11.1 dia x 3.3 high)
CB_M4_D, CB_M4_DEPTH = 8.2, 2.5  # M4 button head (7.6 dia x 2.2 high)

# Cold shoe (ISO 518 foot is 18.6 wide, ~2 thick)
SHOE_W = 18.8          # channel width
SHOE_DEPTH = 2.2       # channel depth under the cap
SHOE_SLOT = 12.6       # gap between cap rails
SHOE_LEN = TOP_D - 3   # open at the back, 3 mm stop wall at the front
SHOE_XS = (TOP_X0 + 16, UP_X - 16)


def plate(w, d, t, r=R):
    return extrude(RectangleRounded(w, d, r, align=Align.MIN), t)


def holes(part, pts, dia, t):
    for x, y in pts:
        part -= Pos(x, y, -1) * Cylinder(dia / 2, t + 2, align=(Align.CENTER, Align.CENTER, Align.MIN))
    return part


def slot(part, x0, x1, y, w, t):
    s = Pos((x0 + x1) / 2, y, -1) * extrude(SlotCenterToCenter(x1 - x0, w), t + 2)
    return part - s


def counterbore_from_below(part, pts, dia, depth):
    for x, y in pts:
        part -= Pos(x, y, -1) * Cylinder(dia / 2, depth + 1,
                                         align=(Align.CENTER, Align.CENTER, Align.MIN))
    return part


def countersink(part, pts, dia_hole, dia_head, t):
    """90 deg countersink on the plate's top face (z = t)."""
    for x, y in pts:
        part -= Pos(x, y, t - dia_head / 2) * Cone(0, dia_head / 2 + 0.01, dia_head / 2 + 0.01,
                                                     align=(Align.CENTER, Align.CENTER, Align.MIN))
    return part


# ---- Base (built flat, top face at z = PT; placed so its top is cage Z0) ----
BASE_W = UP_X + PT + 3  # extra 3 mm keeps the M4 counterbores off the edge
base = plate(BASE_W, BASE_D, PT) + Pos(LENS_CLEAR_X, 0, 0) * plate(
    BASE_W - LENS_CLEAR_X, GRIP_BASE_D, PT)
base = slot(base, TRIPOD_X - 6, TRIPOD_X + 6, TRIPOD_Y, CLR_14, PT)
base -= Pos(TRIPOD_X, TRIPOD_Y, -1) * extrude(SlotCenterToCenter(12, CB_14_W), CB_14_D + 1)
# Door outline plus 1 mm, but always leave solid rails front and back
bx0, bx1 = max(BATT_X[0] - 1, LENS_CLEAR_X + RAIL), BATT_X[1] + 1
by0, by1 = max(BATT_Y[0] - 1, RAIL), min(BATT_Y[1] + 1, GRIP_BASE_D - RAIL)
base -= Pos(bx0, by0, -1) * extrude(RectangleRounded(bx1 - bx0, by1 - by0, 2, align=Align.MIN),
                                    PT + 2)
UP_SCREWS_Y = (8.0, GRIP_BASE_D - 8.0)
base_up_holes = [(UP_X + PT / 2, y) for y in UP_SCREWS_Y]
base = holes(base, base_up_holes, CLR_M4, PT)
base = counterbore_from_below(base, base_up_holes, CB_M4_D, CB_M4_DEPTH)
base = holes(base, [(20.0, BASE_D / 2), (TRIPOD_X + 16, 8.0)], TAP_14_20, PT)

# ---- Upright (built flat: plate X = cage Y, plate Y = cage Z) ----
UP_D = GRIP_BASE_D
upright = plate(UP_D, UP_H, PT)
win = Pos(9, LUG_Z[0], -1) * extrude(RectangleRounded(UP_D - 18, LUG_Z[1] - LUG_Z[0], 3,
                                                      align=Align.MIN), PT + 2)
upright -= win
upright = holes(upright, [(UP_D / 2, 12.0), (8.0, UP_H - 7.0), (UP_D - 8.0, UP_H - 7.0)],
                TAP_14_20, PT)

# ---- Top bar (built flat, top face up) ----
TOP_W = UP_X + PT - TOP_X0
top = plate(TOP_W, TOP_D, PT)
for sx in SHOE_XS:
    top -= Pos(sx - TOP_X0 - SHOE_W / 2, -1, PT - SHOE_DEPTH) * Box(
        SHOE_W, SHOE_LEN + 1, SHOE_DEPTH + 1, align=Align.MIN)
top_up_pts = [(TOP_W - PT / 2, y) for y in (6.0, TOP_D - 6.0)]
# M4 button heads sit on the cap and pass through the bar into the upright
top = holes(top, top_up_pts, CLR_M4, PT)
cap_pts = [(x, y) for x in (6.0, (SHOE_XS[0] + SHOE_XS[1]) / 2 - TOP_X0) for y in (6.0, TOP_D - 6.0)]
top = holes(top, cap_pts, TAP_M3, PT)
top = holes(top, [((SHOE_XS[0] + SHOE_XS[1]) / 2 - TOP_X0, TOP_D / 2)], TAP_14_20, PT)

cap = plate(TOP_W, TOP_D, CAP_T)
for sx in SHOE_XS:
    cap -= Pos(sx - TOP_X0 - SHOE_SLOT / 2, -1, -1) * Box(
        SHOE_SLOT, SHOE_LEN + 1, CAP_T + 2, align=Align.MIN)
cap = holes(cap, cap_pts, CLR_M3, CAP_T)
cap = countersink(cap, cap_pts, CLR_M3, 6.0, CAP_T)
cap = holes(cap, top_up_pts, CLR_M4, CAP_T)
cap = holes(cap, [((SHOE_XS[0] + SHOE_XS[1]) / 2 - TOP_X0, TOP_D / 2)], CLR_14 + 2, CAP_T)

# ---- Assembly placement ----
asm_base = Pos(0, 0, -PT) * base
# Plate X -> cage Y, plate Y -> cage Z, thickness -> +X from the inner face
asm_upright = Plane((UP_X, 0, 0), x_dir=(0, 1, 0), z_dir=(1, 0, 0)) * upright
asm_top = Pos(TOP_X0, 0, UP_H) * top
asm_cap = Pos(TOP_X0, 0, UP_H + PT) * cap
camera = Box(CAM_W, BODY_D, CAM_H, align=Align.MIN)

PARTS = {"base": base, "upright": upright, "top_bar": top, "shoe_cap": cap}

if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    # Upright's inner face must sit at X = UP_X
    bb = asm_upright.bounding_box()
    assert abs(bb.min.X - UP_X) < 1e-6 and abs(bb.max.X - (UP_X + PT)) < 1e-6, bb
    assert abs(bb.min.Z) < 1e-6 and abs(bb.max.Z - UP_H) < 1e-6, bb
    for p in (asm_upright, asm_top):
        assert (camera & p).volume < 1e-6, "cage part hits the camera block"
    for name, part in PARTS.items():
        assert part.is_valid, name
        export_step(part, f"{out}/{name}.step")
        bb = part.bounding_box()
        print(f"{name:9s} {bb.size.X:6.1f} x {bb.size.Y:5.1f} x {bb.size.Z:4.2f} mm")
    asm = Compound(label="cage", children=[asm_base, asm_upright, asm_top, asm_cap])
    export_step(asm, f"{out}/cage_assembly.step")
    export_stl(Compound([asm_base, asm_upright, asm_top, asm_cap]), f"{out}/cage_assembly.stl")
    export_stl(camera, f"{out}/_camera_block.stl")
