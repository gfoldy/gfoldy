// Minimal DB presence check. The calculator itself needs no database; this is
// here for the health check and future cloud sync of tool cribs / jobs.

export function hasDb(): boolean {
  return Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);
}
