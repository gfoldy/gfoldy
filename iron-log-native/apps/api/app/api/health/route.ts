import { hasDb } from '../../../lib/db';

export const runtime = 'nodejs';

export async function GET() {
  return Response.json({ ok: true, service: 'iron-log-api', db: hasDb() });
}
