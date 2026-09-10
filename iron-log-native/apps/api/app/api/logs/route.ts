import { sql, hasDb } from '../../../lib/db';
import { bearer, readSession } from '../../../lib/auth';
import { computeSummary } from '@ironlog/core';
import type { LogSet } from '@ironlog/core';

export const runtime = 'nodejs';

// GET /api/logs — the signed-in user's logs (for restoring on a new device).
export async function GET(req: Request) {
  if (!hasDb()) return Response.json({ error: 'not configured' }, { status: 503 });
  const uidStr = await readSession(bearer(req));
  if (!uidStr) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { rows } = await sql`SELECT data FROM logs WHERE profile_id = ${uidStr}`;
  return Response.json(rows.map((r) => r.data));
}

// POST /api/logs — upsert a batch of logs, then refresh the profile summary.
export async function POST(req: Request) {
  if (!hasDb()) return Response.json({ error: 'not configured' }, { status: 503 });
  const uidStr = await readSession(bearer(req));
  if (!uidStr) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const logs = (await req.json()) as LogSet[];
  if (!Array.isArray(logs)) return Response.json({ error: 'bad request' }, { status: 400 });

  for (const l of logs) {
    await sql`
      INSERT INTO logs (id, profile_id, date, exercise, data)
      VALUES (${l.id}, ${uidStr}, ${l.date}, ${l.exercise}, ${JSON.stringify(l)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET date = EXCLUDED.date, exercise = EXCLUDED.exercise, data = EXCLUDED.data`;
  }

  // Refresh the denormalised summary used by People/Ranks.
  const { rows } = await sql`SELECT data FROM logs WHERE profile_id = ${uidStr}`;
  const summary = computeSummary(rows.map((r) => r.data as LogSet));
  await sql`
    UPDATE profiles
    SET stats = ${JSON.stringify(summary.stats)}::jsonb, top_lifts = ${JSON.stringify(summary.top_lifts)}::jsonb
    WHERE id = ${uidStr}`;

  return Response.json({ ok: true, count: logs.length });
}
