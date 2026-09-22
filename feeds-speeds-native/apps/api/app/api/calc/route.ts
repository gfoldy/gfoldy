import { computeFeedsSpeeds, type CalcInput } from '@feedspeed/core';

export const runtime = 'nodejs';

// POST a CalcInput JSON body -> full CalcResult, computed with the SAME core
// the native app uses. Lets integrations (CAM plugins, bots) hit one source of
// truth for feeds & speeds.
export async function POST(req: Request) {
  let body: Partial<CalcInput>;
  try {
    body = (await req.json()) as Partial<CalcInput>;
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const required: (keyof CalcInput)[] = ['machineKey', 'materialKey', 'toolMaterialKey', 'toolTypeKey', 'diameter', 'unit'];
  for (const k of required) {
    if (body[k] == null) return Response.json({ error: `missing field: ${k}` }, { status: 400 });
  }

  const input: CalcInput = {
    machineKey: String(body.machineKey),
    customRpmMin: body.customRpmMin,
    customRpmMax: body.customRpmMax,
    customHp: body.customHp,
    materialKey: String(body.materialKey),
    toolMaterialKey: String(body.toolMaterialKey),
    toolTypeKey: String(body.toolTypeKey),
    diameter: Number(body.diameter),
    unit: body.unit === 'mm' ? 'mm' : 'in',
    flutes: Number(body.flutes ?? 2),
    stickout: body.stickout == null ? undefined : Number(body.stickout),
    operation: (body.operation ?? 'roughing') as CalcInput['operation'],
    aggressiveness: (body.aggressiveness ?? 1) as CalcInput['aggressiveness'],
    chipThinning: body.chipThinning ?? true,
  };

  const result = computeFeedsSpeeds(input);
  const status = result.error ? 422 : 200;
  return Response.json(result, { status });
}
