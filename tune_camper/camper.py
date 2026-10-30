"""Full-size planning model: Tune M1-style pop-up truck camper on a
Chevrolet Silverado 1500 with the 5'8" box.

This is a massing model for checking fit and clearances (heights, widths,
sleeping space, cab-over), not a manufacturing drawing. The truck and
camper are simplified blocks.

Values marked PUBLISHED come from published specs. Values marked MEASURE
are estimates: replace them with Tune's fit sheet for your truck or a tape
measure, then rerun.

Coordinates (inches): X runs rearward from the front wall of the bed,
Y across the truck (0 = centreline), Z up from the ground.
STEP/STL files are exported in millimetres.
"""
from build123d import *

IN = 25.4

# ---- Truck: Silverado 1500, 5'8" box ----
BED_L = 69.9           # PUBLISHED: box floor length
WHEELWELL_W = 50.6     # PUBLISHED: width between wheel wells
BED_IN_W = 71.4        # MEASURE: inside width at the top of the bed rails
BED_DEPTH = 22.4       # MEASURE: bed floor to top of rail
RAIL_W = 2.5           # MEASURE: width of the bed rail cap
RAIL_Z = 57.0          # MEASURE: ground to top of bed rail (varies by trim/4x4)
TRUCK_W = 81.2         # MEASURE: body width without mirrors
CAB_ROOF_Z = 75.5      # MEASURE: ground to cab roof (no roof lights)
CAB_GAP = 3.0          # gap between the back of the cab and the bed
CAB_L = 52.0           # MEASURE: length of the flat part of the cab roof
WHEEL_D = 33.0         # MEASURE: tire diameter
REAR_AXLE_X = 38.0     # MEASURE: rear axle behind the bed's front wall
TAILGATE_T = 3.0

# ---- Camper (Tune M1 style) ----
OVERHANG = 6.0         # PUBLISHED: shell extends 6" past the bed sides
WALL_T = 1.5           # MEASURE: shell wall thickness
CABOVER_L = 20.0       # MEASURE: how far the shell runs forward over the cab
PLATFORM_L = 60.0      # PUBLISHED: sleeping platform, fore-aft
PLATFORM_W = 78.0      # PUBLISHED: sleeping platform, side to side
PLATFORM_T = 2.0       # MEASURE: platform panel
MATTRESS_T = 4.0       # MEASURE: mattress that stays in when the roof closes
CAB_CLEAR = 1.0        # MEASURE: gap between cab roof and cab-over underside
ROOF_T = 3.0           # MEASURE: roof panel thickness
HEADROOM = 82.0        # PUBLISHED ("nearly 7 ft"): bed floor to roof, popped up
DOOR_W, DOOR_H = 30.0, 40.0  # MEASURE: rear entry above the tailgate

# The closed height is set by the stack over the cab: clearance, cab-over
# floor, platform, mattress, then the roof.
CABOVER_FLOOR_Z = CAB_ROOF_Z + CAB_CLEAR          # underside of the cab-over
PLATFORM_Z = CABOVER_FLOOR_Z + WALL_T             # platform rests on the cab-over floor
SHELL_TOP_Z = PLATFORM_Z + PLATFORM_T + MATTRESS_T + 0.5

SHELL_W = BED_IN_W + 2 * RAIL_W + 2 * OVERHANG
SHELL_X0 = -CAB_GAP - CABOVER_L          # front of the cab-over
SHELL_X1 = BED_L + TAILGATE_T            # flush with the closed tailgate
BED_FLOOR_Z = RAIL_Z - BED_DEPTH
ROOF_CLOSED_Z = SHELL_TOP_Z
ROOF_OPEN_Z = BED_FLOOR_Z + HEADROOM     # underside of roof when popped up
LOWER_SKIRT = 6.0      # MEASURE: how far the overhang skirt drops below the rails


def box(x0, x1, y0, y1, z0, z1):
    return Pos(x0, y0, z0) * Box(x1 - x0, y1 - y0, z1 - z0, align=Align.MIN)


# ---- Truck (simplified) ----
bw = BED_IN_W / 2 + RAIL_W
bed = (box(0, BED_L + TAILGATE_T, -bw, bw, BED_FLOOR_Z - 2, RAIL_Z)
       - box(0.01, BED_L, -BED_IN_W / 2, BED_IN_W / 2, BED_FLOOR_Z, RAIL_Z + 1))
for s in (-1, 1):  # wheel wells
    ww0 = WHEELWELL_W / 2
    y0, y1 = (ww0, BED_IN_W / 2) if s > 0 else (-BED_IN_W / 2, -ww0)
    bed += box(REAR_AXLE_X - 16, REAR_AXLE_X + 16, y0, y1, BED_FLOOR_Z, BED_FLOOR_Z + 11)
HOOD_Z = 52.0          # MEASURE: hood height at the cowl
COWL_X = -CAB_GAP - CAB_L - 30           # base of the windshield
# Cab side profile (X, Z), with a raked windshield, extruded across the truck
cab_profile = Polygon((-CAB_GAP, BED_FLOOR_Z - 2), (-CAB_GAP, CAB_ROOF_Z),
                      (-CAB_GAP - CAB_L, CAB_ROOF_Z), (COWL_X, HOOD_Z),
                      (COWL_X, BED_FLOOR_Z - 2), align=None)
cab = Pos(0, TRUCK_W / 2 - 2, 0) * Rot(90, 0, 0) * extrude(cab_profile, TRUCK_W - 4)
hood = box(COWL_X - 60, COWL_X, -TRUCK_W / 2 + 3, TRUCK_W / 2 - 3, BED_FLOOR_Z - 2, HOOD_Z)
wheels = []
for x in (REAR_AXLE_X, REAR_AXLE_X - 147.5):  # 147.5" wheelbase (crew cab, short box)
    for s in (-1, 1):
        wheels.append(Pos(x, s * (TRUCK_W / 2 - 6), WHEEL_D / 2)
                      * Rot(90, 0, 0) * Cylinder(WHEEL_D / 2, 11))
truck = Compound([bed, cab, hood, *wheels])

# ---- Camper shell (lower) ----
sw = SHELL_W / 2
shell = box(SHELL_X0, SHELL_X1, -sw, sw, RAIL_Z - LOWER_SKIRT, SHELL_TOP_Z)
# Hollow it: open top, interior down to the bed rails
shell -= box(SHELL_X0 + WALL_T, SHELL_X1 - WALL_T, -sw + WALL_T, sw - WALL_T,
             CABOVER_FLOOR_Z + WALL_T, SHELL_TOP_Z + 1)
shell -= box(-0.01, SHELL_X1 - WALL_T, -BED_IN_W / 2, BED_IN_W / 2,
             RAIL_Z - LOWER_SKIRT - 1, SHELL_TOP_Z + 1)
# Skirt hangs outside the rails only
shell -= box(SHELL_X0 - 1, SHELL_X1 + 1, -bw, bw, RAIL_Z - LOWER_SKIRT - 1, RAIL_Z)
# Cab-over must clear the cab roof
shell -= box(SHELL_X0 - 1, 0, -sw - 1, sw + 1, RAIL_Z - LOWER_SKIRT - 1, CABOVER_FLOOR_Z)
# Rear door opening, sitting just above the tailgate
shell -= box(SHELL_X1 - WALL_T - 1, SHELL_X1 + 1, -DOOR_W / 2, DOOR_W / 2,
             RAIL_Z, min(RAIL_Z + DOOR_H, SHELL_TOP_Z - 2))

platform = box(SHELL_X0 + WALL_T, SHELL_X0 + WALL_T + PLATFORM_L,
               -PLATFORM_W / 2, PLATFORM_W / 2, PLATFORM_Z, PLATFORM_Z + PLATFORM_T)


def roof(z_underside):
    return box(SHELL_X0, SHELL_X1, -sw, sw, z_underside, z_underside + ROOF_T)


roof_closed = roof(ROOF_CLOSED_Z)
roof_open = roof(ROOF_OPEN_Z)
# Soft walls between the shell and the raised roof (shown as thin panels)
soft_walls = (box(SHELL_X0, SHELL_X1, -sw, sw, SHELL_TOP_Z, ROOF_OPEN_Z)
              - box(SHELL_X0 + 0.3, SHELL_X1 - 0.3, -sw + 0.3, sw - 0.3,
                    SHELL_TOP_Z - 1, ROOF_OPEN_Z + 1))

STATES = {
    "closed": [shell, platform, roof_closed],
    "open": [shell, platform, roof_open, soft_walls],
}


def report():
    lines = [
        ("Overall height, roof down", ROOF_CLOSED_Z + ROOF_T),
        ("Overall height, roof up", ROOF_OPEN_Z + ROOF_T),
        ("Clearance over cab roof", CABOVER_FLOOR_Z - CAB_ROOF_Z),
        ("Shell width", SHELL_W),
        ("Shell width minus truck body width", SHELL_W - TRUCK_W),
        ("Shell length", SHELL_X1 - SHELL_X0),
        ("Cab-over length (past bed front)", CABOVER_L + CAB_GAP),
        ("Bed floor to roof, popped up", ROOF_OPEN_Z - BED_FLOOR_Z),
        ("Platform top to roof, popped up", ROOF_OPEN_Z - PLATFORM_Z - PLATFORM_T),
        ("Bed floor to platform underside", PLATFORM_Z - BED_FLOOR_Z),
        ("Platform runs past the bed front", PLATFORM_L - CABOVER_L - CAB_GAP),
        ("Rear door top above bed rail", min(DOOR_H, SHELL_TOP_Z - 2 - RAIL_Z)),
    ]
    w = max(len(k) for k, _ in lines)
    return "\n".join(f"{k:<{w}}  {v:6.1f} in  ({v * IN / 1000:5.2f} m)" for k, v in lines)


if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    for name, parts in STATES.items():
        for p in parts:
            hit = sum((p & t).volume for t in (bed, cab, hood))
            assert hit < 1e-3, f"camper part overlaps the truck ({name}): {hit:.2f} in^3"
    mm = lambda s: scale(s, IN)
    export_stl(mm(truck), f"{out}/_truck.stl")
    for name, parts in STATES.items():
        export_stl(mm(Compound(parts)), f"{out}/_camper_{name}.stl")
        export_step(mm(Compound(label=f"camper_{name}", children=[*parts, truck])),
                    f"{out}/tune_on_silverado_{name}.step")
    rpt = report()
    open(f"{out}/clearances.txt", "w").write(rpt + "\n")
    print(rpt)
