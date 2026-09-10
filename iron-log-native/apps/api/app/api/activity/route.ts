import { sql } from '../../../lib/db';
import { requireUser, bad } from '../../../lib/route';

export const runtime = 'nodejs';

// GET /api/activity — feed of the user + everyone they follow, newest first,
// with author info and a comment count per item.
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { rows } = await sql`
    SELECT a.id, a.user_id, a.type, a.date, a.data, a.created_at,
           p.username, p.display_name,
           (SELECT count(*) FROM comments c WHERE c.activity_id = a.id) AS comment_count
    FROM activity a
    JOIN profiles p ON p.id = a.user_id
    WHERE a.user_id = ${auth.userId}
       OR a.user_id IN (SELECT followee_id FROM follows WHERE follower_id = ${auth.userId})
    ORDER BY a.created_at DESC
    LIMIT 100`;
  return Response.json(rows);
}

// POST /api/activity — upsert one activity row (a training session, PR, join…).
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null) as
    { id?: string; type?: string; date?: string; data?: unknown } | null;
  if (!body?.id || !body.type) return bad('bad request');
  await sql`
    INSERT INTO activity (id, user_id, type, date, data, created_at)
    VALUES (${body.id}, ${auth.userId}, ${body.type}, ${body.date ?? null}, ${JSON.stringify(body.data ?? {})}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, date = EXCLUDED.date`;
  return Response.json({ ok: true });
}

// DELETE /api/activity?id=... — remove one of the user's own activity rows.
export async function DELETE(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return bad('bad request');
  await sql`DELETE FROM activity WHERE id = ${id} AND user_id = ${auth.userId}`;
  return Response.json({ ok: true });
}
