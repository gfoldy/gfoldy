import { sql } from '../../../lib/db';
import { requireUser, bad } from '../../../lib/route';
import { uid } from '@ironlog/core';

export const runtime = 'nodejs';

// GET /api/comments?activity=id — the thread for one activity item.
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const activityId = new URL(req.url).searchParams.get('activity');
  if (!activityId) return bad('bad request');
  const { rows } = await sql`
    SELECT c.id, c.activity_id, c.user_id, c.body, c.created_at, p.username, p.display_name
    FROM comments c JOIN profiles p ON p.id = c.user_id
    WHERE c.activity_id = ${activityId}
    ORDER BY c.created_at ASC`;
  return Response.json(rows);
}

// POST /api/comments { activity_id, body } — add a comment.
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => ({})) as { activity_id?: string; body?: string };
  const text = (body.body || '').trim();
  if (!body.activity_id || !text) return bad('bad request');
  const id = uid();
  await sql`
    INSERT INTO comments (id, activity_id, user_id, body, created_at)
    VALUES (${id}, ${body.activity_id}, ${auth.userId}, ${text.slice(0, 2000)}, now())`;
  const { rows } = await sql`
    SELECT c.id, c.activity_id, c.user_id, c.body, c.created_at, p.username, p.display_name
    FROM comments c JOIN profiles p ON p.id = c.user_id WHERE c.id = ${id}`;
  return Response.json(rows[0]);
}

// DELETE /api/comments?id=... — delete your own comment.
export async function DELETE(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return bad('bad request');
  await sql`DELETE FROM comments WHERE id = ${id} AND user_id = ${auth.userId}`;
  return Response.json({ ok: true });
}
