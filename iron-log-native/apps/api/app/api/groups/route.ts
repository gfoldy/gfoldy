import { sql } from '../../../lib/db';
import { requireUser, bad } from '../../../lib/route';
import { uid } from '@ironlog/core';

export const runtime = 'nodejs';

// GET /api/groups?scope=mine|public — groups with member counts.
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const scope = new URL(req.url).searchParams.get('scope') || 'mine';
  const withCount = (rows: Record<string, unknown>[]) => Response.json(rows);
  if (scope === 'public') {
    const { rows } = await sql`
      SELECT g.*, (SELECT count(*) FROM group_members m WHERE m.group_id = g.id) AS member_count
      FROM groups g WHERE g.is_public = true ORDER BY g.created_at DESC LIMIT 100`;
    return withCount(rows);
  }
  const { rows } = await sql`
    SELECT g.*, (SELECT count(*) FROM group_members m WHERE m.group_id = g.id) AS member_count
    FROM groups g
    WHERE g.id IN (SELECT group_id FROM group_members WHERE user_id = ${auth.userId})
    ORDER BY g.created_at DESC`;
  return withCount(rows);
}

// POST /api/groups { name, description, is_public } — create + join a group.
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const b = await req.json().catch(() => ({})) as { name?: string; description?: string; is_public?: boolean };
  const name = (b.name || '').trim();
  if (!name) return bad('name required');
  const id = uid();
  const invite = uid() + uid().slice(0, 4);
  await sql`
    INSERT INTO groups (id, name, description, is_public, invite_code, owner_id, created_at)
    VALUES (${id}, ${name}, ${b.description ?? ''}, ${b.is_public ?? true}, ${invite}, ${auth.userId}, now())`;
  await sql`INSERT INTO group_members (group_id, user_id) VALUES (${id}, ${auth.userId}) ON CONFLICT DO NOTHING`;
  const { rows } = await sql`SELECT * FROM groups WHERE id = ${id}`;
  return Response.json(rows[0]);
}
