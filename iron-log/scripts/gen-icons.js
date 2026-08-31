#!/usr/bin/env node
// Generates the Iron Log PWA icons as PNGs with zero dependencies.
// Draws a gold barbell on a near-black rounded background using raw pixel
// buffers, then encodes them to PNG via Node's built-in zlib.
'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// --- Palette -------------------------------------------------------------
const BG = [13, 13, 15]; // near-black #0d0d0f
const GOLD = [201, 169, 79]; // #c9a94f
const GOLD_DIM = [150, 125, 58];

// --- CRC32 (for PNG chunks) ---------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // add filter byte (0) per scanline
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Tiny software rasterizer -------------------------------------------
function makeCanvas(size) {
  const buf = Buffer.alloc(size * size * 4);
  return { size, buf };
}
function setPx(cv, x, y, rgb, a = 255) {
  if (x < 0 || y < 0 || x >= cv.size || y >= cv.size) return;
  const i = (y * cv.size + x) * 4;
  // simple alpha blend over existing
  const ia = a / 255;
  cv.buf[i] = Math.round(rgb[0] * ia + cv.buf[i] * (1 - ia));
  cv.buf[i + 1] = Math.round(rgb[1] * ia + cv.buf[i + 1] * (1 - ia));
  cv.buf[i + 2] = Math.round(rgb[2] * ia + cv.buf[i + 2] * (1 - ia));
  cv.buf[i + 3] = Math.max(cv.buf[i + 3], a);
}
// filled rounded rectangle, coords in [0,1] fractions
function roundRect(cv, x0, y0, x1, y1, r, rgb) {
  const S = cv.size;
  const ax = x0 * S, ay = y0 * S, bx = x1 * S, by = y1 * S, rr = r * S;
  for (let y = Math.floor(ay); y < Math.ceil(by); y++) {
    for (let x = Math.floor(ax); x < Math.ceil(bx); x++) {
      // sample 4x supersample for smooth edges
      let hit = 0;
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const px = x + (sx + 0.5) / 2;
          const py = y + (sy + 0.5) / 2;
          let inside = px >= ax && px <= bx && py >= ay && py <= by;
          if (inside && rr > 0) {
            // check each corner
            const corners = [
              [ax + rr, ay + rr], [bx - rr, ay + rr],
              [ax + rr, by - rr], [bx - rr, by - rr],
            ];
            if (px < ax + rr && py < ay + rr) inside = dist(px, py, corners[0]) <= rr;
            else if (px > bx - rr && py < ay + rr) inside = dist(px, py, corners[1]) <= rr;
            else if (px < ax + rr && py > by - rr) inside = dist(px, py, corners[2]) <= rr;
            else if (px > bx - rr && py > by - rr) inside = dist(px, py, corners[3]) <= rr;
          }
          if (inside) hit++;
        }
      }
      if (hit) setPx(cv, x, y, rgb, Math.round((hit / 4) * 255));
    }
  }
}
function dist(x, y, c) { return Math.hypot(x - c[0], y - c[1]); }

function drawIcon(size, { maskable = false } = {}) {
  const cv = makeCanvas(size);
  // Background: fill whole square (near-black). For non-maskable give rounded
  // corners; maskable is full-bleed (OS applies its own mask).
  if (maskable) {
    roundRect(cv, 0, 0, 1, 1, 0, BG);
  } else {
    roundRect(cv, 0, 0, 1, 1, 0.22, BG);
  }
  // Barbell, horizontally centered. Extra inset for maskable safe zone.
  const inset = maskable ? 0.10 : 0.0;
  const cy = 0.5;
  const barH = 0.085;
  // central bar
  roundRect(cv, 0.30 + inset, cy - barH / 2, 0.70 - inset, cy + barH / 2, barH / 2, GOLD);
  // inner plates
  const ip = 0.15; // half-height
  roundRect(cv, 0.22 + inset, cy - ip, 0.30 + inset, cy + ip, 0.03, GOLD);
  roundRect(cv, 0.70 - inset, cy - ip, 0.78 - inset, cy + ip, 0.03, GOLD);
  // outer plates
  const op = 0.20;
  roundRect(cv, 0.15 + inset, cy - op, 0.22 + inset, cy + op, 0.03, GOLD);
  roundRect(cv, 0.78 - inset, cy - op, 0.85 - inset, cy + op, 0.03, GOLD);
  // end caps
  roundRect(cv, 0.115 + inset, cy - 0.10, 0.15 + inset, cy + 0.10, 0.02, GOLD_DIM);
  roundRect(cv, 0.85 - inset, cy - 0.10, 0.885 - inset, cy + 0.10, 0.02, GOLD_DIM);
  return encodePNG(size, size, cv.buf);
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'favicon-32.png', size: 32, maskable: false },
];
for (const t of targets) {
  const png = drawIcon(t.size, { maskable: t.maskable });
  fs.writeFileSync(path.join(outDir, t.name), png);
  console.log('wrote', t.name, png.length, 'bytes');
}
console.log('done');
