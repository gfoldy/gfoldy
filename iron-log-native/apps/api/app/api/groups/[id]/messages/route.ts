import { sql } from '../../../../../lib/db';
import { requireUser, bad } from '../../../../../lib/route';
import { uid } from '@ironlog/core';

export const runtime = 'nodejs';

async function isMember(groupId: string, userId: string): Promise<boolean> {
  const r = await sql`SELECT 1 FROM group_members WHERE group_id = ${groupId} AND user_id = ${userId}`;
  return r.rows.length > 0;
}

// GET /api/groups/:id/messages — chat history (members only).
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  if (!(await isMember(id, auth.userId))) return bad('not a member', 403);
  const { rows } = await sql`
    SELECT gm.id, gm.group_id, gm.user_id, gm.body, gm.created_at, p.username, p.display_name
    FROM group_messages gm JOIN profiles p ON p.id = gm.user_id
    WHERE gm.group_id = ${id} ORDER BY gm.created_at ASC LIMIT 200`;
  return Response.json(rows);
}

// POST /api/groups/:id/messages { body } — send a message (members only).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  if (!(await isMember(id, auth.userId))) return bad('not a member', 403);
  const { body } = await req.json().catch(() => ({})) as { body?: string };
  const text = (body || '').trim();
  if (!text) return bad('empty');
  const mid = uid();
  await sql`
    INSERT INTO group_messages (id, group_id, user_id, body, created_at)
    VALUES (${mid}, ${id}, ${auth.userId}, ${text.slice(0, 2000)}, now())`;
  const { rows } = await sql`
    SELECT gm.id, gm.group_id, gm.user_id, gm.body, gm.created_at, p.username, p.display_name
    FROM group_messages gm JOIN profiles p ON p.id = gm.user_id WHERE gm.id = ${mid}`;
  return Response.json(rows[0]);
}
