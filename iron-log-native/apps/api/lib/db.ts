// Postgres access via @vercel/postgres. On Vercel, provision a Postgres/Neon
// store and the POSTGRES_URL env var is injected automatically.

import { sql } from '@vercel/postgres';

/** True when a connection string is configured (routes degrade gracefully otherwise). */
export const hasDb = (): boolean => !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);

export { sql };
