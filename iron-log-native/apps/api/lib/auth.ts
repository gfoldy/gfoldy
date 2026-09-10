// Username + password auth: bcrypt for hashing, a signed JWT for sessions.
// Set AUTH_SECRET in the environment (a long random string).

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-only-insecure-secret');

export const hashPassword = (pw: string): Promise<string> => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string): Promise<boolean> => bcrypt.compare(pw, hash);

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function readSession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

/** Pull the bearer token from an Authorization header. */
export function bearer(req: Request): string | null {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}
