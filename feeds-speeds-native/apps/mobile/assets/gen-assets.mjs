#!/usr/bin/env node
// Generates the native app's icon, adaptive icon and splash as PNGs with zero
// dependencies (an orange gear on the dark "machine shop" background).
// Run: node assets/gen-assets.mjs
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OR_LT = [255, 178, 110], OR_MD = [255, 138, 61], OR_DK = [201, 106, 43];
const lerp = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
const metal = (t) => (t < 0.35 ? lerp(OR_LT, OR_MD, t / 0.35) : lerp(OR_MD, OR_DK, (t - 0.35) / 0.65));

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

function drawBg(cv, rounded) {
  const S = cv.size, cx = S * 0.5, cy = S * 0.4, maxR = S * 0.9, top = [30, 30, 36], bot = [13, 13, 15], rr = rounded ? 0.22 * S : 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (rr > 0) { const cxk = Math.min(Math.max(x, rr), S - rr), cyk = Math.min(Math.max(y, rr), S - rr); if (Math.hypot(x - cxk, y - cyk) > rr) continue; }
    const d = Math.min(1, Math.hypot(x - cx, y - cy) / maxR); setPx(cv, x, y, lerp(top, bot, d * d), 255);
  }
}

// A gear: `teeth` teeth between rRoot and rOuter, with a round hub hole.
function drawGear(cv, { cx, cy, rOuter, rRoot, rHole, teeth, inset = 0 }) {
  const S = cv.size;
  const CX = cx * S, CY = cy * S, RO = rOuter * S, RR = rRoot * S, RH = rHole * S;
  const toothA = (Math.PI * 2) / teeth;
  const lo = Math.floor(CY - RO - 2), hi = Math.ceil(CY + RO + 2);
  const left = Math.floor(CX - RO - 2), right = Math.ceil(CX + RO + 2);
  for (let y = lo; y < hi; y++) for (let x = left; x < right; x++) {
    let hit = 0;
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const px = x + (sx + 0.5) / 2, py = y + (sy + 0.5) / 2;
      const dx = px - CX, dy = py - CY, r = Math.hypot(dx, dy);
      if (r < RH || r > RO) continue;
      let theta = Math.atan2(dy, dx); if (theta < 0) theta += Math.PI * 2;
      const phase = (theta % toothA) / toothA; // 0..1 within a tooth
      // tooth land occupies the middle ~55% of each pitch, with tapered flanks
      const edge = (phase > 0.225 && phase < 0.775) ? RO : RR;
      if (r <= edge) hit++;
    }
    if (hit) {
      const t = Math.min(1, Math.hypot(x - CX, y - CY) / RO); // radial shade
      setPx(cv, x, y, metal(1 - t * 0.6), Math.round((hit / 4) * 255));
    }
  }
  // subtle inner ring highlight
  for (let a = 0; a < Math.PI * 2; a += 0.004) {
    const rr = RH + (RR - RH) * 0.34;
    setPx(cv, Math.round(CX + Math.cos(a) * rr), Math.round(CY + Math.sin(a) * rr), OR_DK, 90);
  }
}

function drawIcon(size, { maskable = false, rounded = true } = {}) {
  const cv = makeCanvas(size);
  drawBg(cv, rounded && !maskable);
  const inset = maskable ? 0.12 : 0.0;
  const scale = 1 - inset;
  drawGear(cv, { cx: 0.5, cy: 0.5, rOuter: 0.36 * scale, rRoot: 0.29 * scale, rHole: 0.12 * scale, teeth: 9 });
  return encodePNG(size, size, cv.buf);
}

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)));
fs.mkdirSync(outDir, { recursive: true });
const targets = [
  { name: 'icon.png', size: 1024, maskable: false, rounded: false },
  { name: 'adaptive-icon.png', size: 1024, maskable: true },
  { name: 'splash.png', size: 1024, maskable: false, rounded: false },
];
for (const t of targets) {
  const png = drawIcon(t.size, { maskable: t.maskable, rounded: t.rounded });
  fs.writeFileSync(path.join(outDir, t.name), png);
  console.log('wrote', t.name, png.length, 'bytes');
}
console.log('done');
