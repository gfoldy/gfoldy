import { sql } from '../../../lib/db';
import { requireUser } from '../../../lib/route';

export const runtime = 'nodejs';

// PUT /api/splits — replace the signed-in user's split (cloud backup).
export async function PUT(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const days = await req.json().catch(() => null);
  if (!Array.isArray(days)) return Response.json({ error: 'bad request' }, { status: 400 });
  await sql`
    INSERT INTO splits (profile_id, days) VALUES (${auth.userId}, ${JSON.stringify(days)}::jsonb)
    ON CONFLICT (profile_id) DO UPDATE SET days = EXCLUDED.days`;
  return Response.json({ ok: true });
}
