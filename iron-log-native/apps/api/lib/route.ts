// Small helpers shared by the authenticated route handlers.

import { bearer, readSession } from './auth';
import { hasDb } from './db';

/** Require a configured DB + a valid session. Returns the userId or a Response. */
export async function requireUser(req: Request): Promise<{ userId: string } | Response> {
  if (!hasDb()) return Response.json({ error: 'API database not configured' }, { status: 503 });
  const userId = await readSession(bearer(req));
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 });
  return { userId };
}

export const bad = (msg: string, status = 400): Response => Response.json({ error: msg }, { status });
