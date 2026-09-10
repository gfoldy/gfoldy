import { sql, hasDb } from '../../../lib/db';

export const runtime = 'nodejs';

// Public directory: every non-private member's profile + denormalised summary.
export async function GET() {
  if (!hasDb()) return Response.json([]);
  try {
    const { rows } = await sql`
      SELECT id, username, display_name, stats, top_lifts
      FROM profiles
      WHERE COALESCE(is_private, false) = false
      ORDER BY created_at DESC
      LIMIT 200`;
    return Response.json(rows);
  } catch {
    return Response.json([]);
  }
}
