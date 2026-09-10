import { sql } from '../../../lib/db';
import { requireUser, bad } from '../../../lib/route';

export const runtime = 'nodejs';

// GET /api/follows — the set of ids the signed-in user follows.
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { rows } = await sql`SELECT followee_id FROM follows WHERE follower_id = ${auth.userId}`;
  return Response.json(rows.map((r) => r.followee_id));
}

// POST /api/follows { followee } — follow a user.
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { followee } = await req.json().catch(() => ({})) as { followee?: string };
  if (!followee || followee === auth.userId) return bad('bad request');
  await sql`
    INSERT INTO follows (follower_id, followee_id) VALUES (${auth.userId}, ${followee})
    ON CONFLICT DO NOTHING`;
  return Response.json({ ok: true });
}

// DELETE /api/follows?followee=id — unfollow.
export async function DELETE(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const followee = new URL(req.url).searchParams.get('followee');
  if (!followee) return bad('bad request');
  await sql`DELETE FROM follows WHERE follower_id = ${auth.userId} AND followee_id = ${followee}`;
  return Response.json({ ok: true });
}
