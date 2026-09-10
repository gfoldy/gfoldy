import { sql } from '../../../../lib/db';
import { requireUser, bad } from '../../../../lib/route';

export const runtime = 'nodejs';

// GET /api/groups/:id — group detail: the group, its members (with profiles),
// and whether the viewer is a member.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  const g = await sql`SELECT * FROM groups WHERE id = ${id}`;
  if (!g.rows.length) return bad('not found', 404);
  const members = await sql`
    SELECT m.user_id, m.joined_at, p.username, p.display_name, p.stats
    FROM group_members m JOIN profiles p ON p.id = m.user_id
    WHERE m.group_id = ${id} ORDER BY m.joined_at ASC`;
  const isMember = members.rows.some((r) => r.user_id === auth.userId);
  return Response.json({ group: g.rows[0], members: members.rows, isMember });
}

// DELETE /api/groups/:id — owner deletes the group.
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  await sql`DELETE FROM groups WHERE id = ${id} AND owner_id = ${auth.userId}`;
  return Response.json({ ok: true });
}
