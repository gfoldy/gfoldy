export function fmtNum(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString('en-US');
}

export function fmtK(v: number): string {
  return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : String(Math.round(v));
}
