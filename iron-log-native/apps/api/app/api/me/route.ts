import { sql } from '../../../lib/db';
import { requireUser, bad } from '../../../lib/route';

export const runtime = 'nodejs';

// GET /api/me — the signed-in user's own profile + split.
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { rows } = await sql`
    SELECT id, username, display_name, unit, is_private, stats, top_lifts
    FROM profiles WHERE id = ${auth.userId}`;
  if (!rows.length) return bad('not found', 404);
  const split = await sql`SELECT days FROM splits WHERE profile_id = ${auth.userId}`;
  return Response.json({ ...rows[0], split: split.rows[0]?.days ?? [] });
}

// PATCH /api/me — update display name, unit, or privacy.
export async function PATCH(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => ({})) as { display_name?: string; unit?: string; is_private?: boolean };
  await sql`
    UPDATE profiles SET
      display_name = COALESCE(${body.display_name ?? null}, display_name),
      unit = COALESCE(${body.unit ?? null}, unit),
      is_private = COALESCE(${body.is_private ?? null}, is_private)
    WHERE id = ${auth.userId}`;
  return Response.json({ ok: true });
}
