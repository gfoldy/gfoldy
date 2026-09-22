import { MACHINES, MATERIALS, TOOL_MATERIALS, TOOL_TYPES, OPERATIONS } from '@feedspeed/core';

export const runtime = 'nodejs';

// Serve the option catalog (machines, materials, tools, operations) so a client
// can build its pickers from one authoritative source.
export async function GET() {
  return Response.json({
    machines: MACHINES,
    materials: MATERIALS,
    toolMaterials: TOOL_MATERIALS,
    toolTypes: TOOL_TYPES,
    operations: OPERATIONS,
  });
}
