// Date helpers. All dates are local "YYYY-MM-DD" strings; weeks start Monday.

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAYS_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export function dateToStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

export function todayStr(): string {
  return dateToStr(new Date());
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function weekdayOf(dateStr: string): number {
  return parseDate(dateStr).getDay();
}

export function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = x.getDay(); // 0=Sun
  const diff = wd === 0 ? -6 : 1 - wd;
  x.setDate(x.getDate() + diff);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function fmtShort(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
}

/** Whole weeks between two Mondays. */
export function weeksBetween(aMon: Date, bMon: Date): number {
  return Math.round((bMon.getTime() - aMon.getTime()) / (7 * 86400000));
}
