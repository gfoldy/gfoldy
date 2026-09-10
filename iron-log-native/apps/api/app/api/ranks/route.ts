import { sql, hasDb } from '../../../lib/db';

export const runtime = 'nodejs';

// Leaderboards by a stats field: volume | sets | sessions.
export async function GET(req: Request) {
  if (!hasDb()) return Response.json([]);
  const url = new URL(req.url);
  const metric = url.searchParams.get('metric') || 'volume';
  const field = ['volume', 'sets', 'sessions'].includes(metric) ? metric : 'volume';
  try {
    const { rows } = await sql`
      SELECT id, username, display_name, stats, top_lifts
      FROM profiles
      WHERE COALESCE(is_private, false) = false
      ORDER BY (stats ->> ${field})::numeric DESC NULLS LAST
      LIMIT 100`;
    return Response.json(rows);
  } catch {
    return Response.json([]);
  }
}
