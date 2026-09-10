export function fmtNum(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString('en-US');
}

export function fmtK(v: number): string {
  return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : String(Math.round(v));
}

export function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd';
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
