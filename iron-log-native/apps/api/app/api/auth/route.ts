import { sql, hasDb } from '../../../lib/db';
import { hashPassword, verifyPassword, signSession } from '../../../lib/auth';
import { uid } from '@ironlog/core';

export const runtime = 'nodejs';

// POST { action: 'signup' | 'login', username, password, display_name? }
export async function POST(req: Request) {
  if (!hasDb()) return Response.json({ error: 'API database not configured' }, { status: 503 });
  let body: { action?: string; username?: string; password?: string; display_name?: string };
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }

  const username = (body.username || '').trim().toLowerCase();
  const password = body.password || '';
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return Response.json({ error: 'Invalid username' }, { status: 400 });
  if (password.length < 6) return Response.json({ error: 'Password too short' }, { status: 400 });

  try {
    if (body.action === 'signup') {
      const exists = await sql`SELECT 1 FROM profiles WHERE username = ${username}`;
      if (exists.rows.length) return Response.json({ error: 'Username taken' }, { status: 409 });
      const id = uid();
      const hash = await hashPassword(password);
      await sql`
        INSERT INTO profiles (id, username, display_name, password_hash, created_at)
        VALUES (${id}, ${username}, ${body.display_name || username}, ${hash}, now())`;
      const token = await signSession(id);
      return Response.json({ token, profile: { id, username, display_name: body.display_name || username } });
    }

    // login
    const { rows } = await sql`SELECT id, display_name, password_hash FROM profiles WHERE username = ${username}`;
    const row = rows[0];
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return Response.json({ error: 'Wrong username or password' }, { status: 401 });
    }
    const token = await signSession(row.id);
    return Response.json({ token, profile: { id: row.id, username, display_name: row.display_name } });
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
