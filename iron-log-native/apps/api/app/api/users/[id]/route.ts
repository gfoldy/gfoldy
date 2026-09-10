import { sql } from '../../../../lib/db';
import { requireUser, bad } from '../../../../lib/route';

export const runtime = 'nodejs';

// GET /api/users/:id — a public profile: summary, split and top lifts, plus
// whether the viewer follows them / they follow back.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;

  const { rows } = await sql`
    SELECT id, username, display_name, unit, is_private, stats, top_lifts
    FROM profiles WHERE id = ${id}`;
  const profile = rows[0];
  if (!profile) return bad('not found', 404);

  const days = profile.is_private
    ? []
    : (await sql`SELECT days FROM splits WHERE profile_id = ${id}`).rows[0]?.days ?? [];

  const rel = await sql`
    SELECT
      EXISTS (SELECT 1 FROM follows WHERE follower_id = ${auth.userId} AND followee_id = ${id}) AS following,
      EXISTS (SELECT 1 FROM follows WHERE follower_id = ${id} AND followee_id = ${auth.userId}) AS follows_me`;

  return Response.json({ profile: { ...profile, split: days }, ...rel.rows[0] });
}
