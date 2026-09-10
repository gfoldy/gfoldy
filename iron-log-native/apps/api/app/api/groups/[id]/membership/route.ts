import { sql } from '../../../../../lib/db';
import { requireUser, bad } from '../../../../../lib/route';

export const runtime = 'nodejs';

// POST /api/groups/:id/membership { invite? } — join. Private groups require a
// matching invite code.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  const { invite } = await req.json().catch(() => ({})) as { invite?: string };
  const g = await sql`SELECT is_public, invite_code FROM groups WHERE id = ${id}`;
  const group = g.rows[0];
  if (!group) return bad('not found', 404);
  if (!group.is_public && group.invite_code !== invite) return bad('invite required', 403);
  await sql`INSERT INTO group_members (group_id, user_id) VALUES (${id}, ${auth.userId}) ON CONFLICT DO NOTHING`;
  return Response.json({ ok: true });
}

// DELETE /api/groups/:id/membership — leave.
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  await sql`DELETE FROM group_members WHERE group_id = ${id} AND user_id = ${auth.userId}`;
  return Response.json({ ok: true });
}
