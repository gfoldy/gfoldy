#!/usr/bin/env node
// Generates the native app's icon, adaptive icon and splash as PNGs with zero
// dependencies (a gold barbell on a noir background). Ported from the PWA's
// scripts/gen-icons.js. Run: node assets/gen-assets.mjs
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOLD_LT = [236, 214, 152], GOLD_MD = [203, 171, 83], GOLD_DK = [150, 122, 50];
const lerp = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
const metal = (t) => (t < 0.32 ? lerp(GOLD_LT, GOLD_MD, t / 0.32) : lerp(GOLD_MD, GOLD_DK, (t - 0.32) / 0.68));

const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const body = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0); return Buffer.concat([len, body, crc]); }
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const stride = w * 4, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const makeCanvas = (size) => ({ size, buf: Buffer.alloc(size * size * 4) });
function setPx(cv, x, y, rgb, a = 255) { if (x < 0 || y < 0 || x >= cv.size || y >= cv.size) return; const i = (y * cv.size + x) * 4; const ia = a / 255; cv.buf[i] = Math.round(rgb[0] * ia + cv.buf[i] * (1 - ia)); cv.buf[i + 1] = Math.round(rgb[1] * ia + cv.buf[i + 1] * (1 - ia)); cv.buf[i + 2] = Math.round(rgb[2] * ia + cv.buf[i + 2] * (1 - ia)); cv.buf[i + 3] = Math.max(cv.buf[i + 3], a); }
const dist = (x, y, c) => Math.hypot(x - c[0], y - c[1]);
function roundRect(cv, x0, y0, x1, y1, r, col) {
  const S = cv.size, ax = x0 * S, ay = y0 * S, bx = x1 * S, by = y1 * S, rr = r * S;
  for (let y = Math.floor(ay); y < Math.ceil(by); y++) for (let x = Math.floor(ax); x < Math.ceil(bx); x++) {
    let hit = 0;
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const px = x + (sx + 0.5) / 2, py = y + (sy + 0.5) / 2;
      let inside = px >= ax && px <= bx && py >= ay && py <= by;
      if (inside && rr > 0) {
        const corners = [[ax + rr, ay + rr], [bx - rr, ay + rr], [ax + rr, by - rr], [bx - rr, by - rr]];
        if (px < ax + rr && py < ay + rr) inside = dist(px, py, corners[0]) <= rr;
        else if (px > bx - rr && py < ay + rr) inside = dist(px, py, corners[1]) <= rr;
        else if (px < ax + rr && py > by - rr) inside = dist(px, py, corners[2]) <= rr;
        else if (px > bx - rr && py > by - rr) inside = dist(px, py, corners[3]) <= rr;
      }
      if (inside) hit++;
    }
    if (hit) { const t = by > ay ? Math.min(1, Math.max(0, (y + 0.5 - ay) / (by - ay))) : 0; setPx(cv, x, y, typeof col === 'function' ? col(t) : col, Math.round((hit / 4) * 255)); }
  }
}
function drawBg(cv, rounded) {
  const S = cv.size, cx = S * 0.5, cy = S * 0.34, maxR = S * 0.95, top = [30, 30, 36], bot = [9, 9, 11], rr = rounded ? 0.22 * S : 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (rr > 0) { const cxk = Math.min(Math.max(x, rr), S - rr), cyk = Math.min(Math.max(y, rr), S - rr); if (Math.hypot(x - cxk, y - cyk) > rr) continue; }
    const d = Math.min(1, Math.hypot(x - cx, y - cy) / maxR); setPx(cv, x, y, lerp(top, bot, d * d), 255);
  }
}
function drawIcon(size, { maskable = false, rounded = true } = {}) {
  const cv = makeCanvas(size); drawBg(cv, rounded && !maskable);
  const inset = maskable ? 0.10 : 0.0, cy = 0.5, barH = 0.085, sh = [0, 0, 0], shOff = 0.012;
  roundRect(cv, 0.30 + inset, cy - barH / 2 + shOff, 0.70 - inset, cy + barH / 2 + shOff, barH / 2, () => sh);
  roundRect(cv, 0.15 + inset, cy - 0.20 + shOff, 0.30 + inset, cy + 0.20 + shOff, 0.035, () => sh);
  roundRect(cv, 0.70 - inset, cy - 0.20 + shOff, 0.85 - inset, cy + 0.20 + shOff, 0.035, () => sh);
  roundRect(cv, 0.30 + inset, cy - barH / 2, 0.70 - inset, cy + barH / 2, barH / 2, metal);
  roundRect(cv, 0.22 + inset, cy - 0.15, 0.30 + inset, cy + 0.15, 0.03, metal);
  roundRect(cv, 0.70 - inset, cy - 0.15, 0.78 - inset, cy + 0.15, 0.03, metal);
  roundRect(cv, 0.15 + inset, cy - 0.20, 0.22 + inset, cy + 0.20, 0.035, metal);
  roundRect(cv, 0.78 - inset, cy - 0.20, 0.85 - inset, cy + 0.20, 0.035, metal);
  roundRect(cv, 0.115 + inset, cy - 0.10, 0.15 + inset, cy + 0.10, 0.02, GOLD_DK);
  roundRect(cv, 0.85 - inset, cy - 0.10, 0.885 - inset, cy + 0.10, 0.02, GOLD_DK);
  return encodePNG(size, size, cv.buf);
}

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)));
fs.mkdirSync(outDir, { recursive: true });
const targets = [
  { name: 'icon.png', size: 1024, maskable: false, rounded: false }, // App Store / launcher (square; iOS masks)
  { name: 'adaptive-icon.png', size: 1024, maskable: true },         // Android adaptive foreground
  { name: 'splash.png', size: 1024, maskable: false, rounded: false }, // centered on splash bg
];
for (const t of targets) {
  const png = drawIcon(t.size, { maskable: t.maskable, rounded: t.rounded });
  fs.writeFileSync(path.join(outDir, t.name), png);
  console.log('wrote', t.name, png.length, 'bytes');
}
console.log('done');
