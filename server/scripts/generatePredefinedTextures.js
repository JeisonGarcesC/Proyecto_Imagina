// Original, deterministic test patterns. Run once when introducing revision 1.
// New catalog revisions must use new filenames and asset IDs; never overwrite old images.
import { mkdir, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = fileURLToPath(new URL('../assets/special-finishes/predefined/', import.meta.url));
const SIZE = 512;
const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
const mix = (a, b, amount) => a * (1 - amount) + b * amount;

function hash(x, y, seed = 0) {
  let value = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1442695041, 2246822519) ^ seed;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function noise(x, y, cells, seed = 0) {
  const px = x / SIZE * cells;
  const py = y / SIZE * cells;
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const fx = px - ix;
  const fy = py - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sample = (dx, dy) => hash(mod(ix + dx, cells), mod(iy + dy, cells), seed);
  return mix(mix(sample(0, 0), sample(1, 0), sx),
    mix(sample(0, 1), sample(1, 1), sx), sy);
}

function brick(x, y, small) {
  const course = small ? 64 : 128;
  const row = Math.floor(y / course);
  const horizontal = mod(x + (row % 2) * SIZE / 2, SIZE);
  const edge = Math.min(horizontal, SIZE - horizontal, mod(y, course), course - mod(y, course));
  const mortar = edge < (small ? 5 : 7);
  const variation = (noise(x, y, 16, 13) - 0.5) * 28 + (hash(Math.floor(x / 3), Math.floor(y / 3), 8) - 0.5) * 12;
  const tone = hash(row, Math.floor((x + (row % 2) * SIZE / 2) / SIZE), 9) * 18;
  return mortar ? [191, 183, 166] : [clamp(164 + tone + variation),
    clamp(84 + tone * 0.6 + variation * 0.55), clamp(61 + variation * 0.45)];
}

function concrete(x, y) {
  const grain = (noise(x, y, 8, 25) - 0.5) * 30 + (noise(x, y, 64, 26) - 0.5) * 13;
  const speck = hash(x, y, 27) > 0.995 ? -34 : 0;
  const value = clamp(175 + grain + speck);
  return [value, clamp(value - 1), clamp(value - 3)];
}

function stone(x, y) {
  const grid = 4;
  const cell = SIZE / grid;
  const ix = Math.floor(x / cell);
  const iy = Math.floor(y / cell);
  let nearest = Infinity;
  let second = Infinity;
  let stoneX = 0;
  let stoneY = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const sx = ix + dx;
      const sy = iy + dy;
      const cx = (sx + 0.5 + (hash(mod(sx, grid), mod(sy, grid), 31) - 0.5) * 0.45) * cell;
      const cy = (sy + 0.5 + (hash(mod(sx, grid), mod(sy, grid), 32) - 0.5) * 0.45) * cell;
      const distance = Math.hypot(x - cx, y - cy);
      if (distance < nearest) {
        second = nearest;
        nearest = distance;
        stoneX = mod(sx, grid);
        stoneY = mod(sy, grid);
      } else if (distance < second) second = distance;
    }
  }
  if (second - nearest < 7) return [105, 104, 98];
  const tone = hash(stoneX, stoneY, 33) * 48;
  const grain = (noise(x, y, 24, 34) - 0.5) * 24;
  return [clamp(149 + tone + grain), clamp(145 + tone + grain), clamp(132 + tone * 0.8 + grain)];
}

function wood(x, y) {
  const plank = Math.floor(x / 128);
  const edge = mod(x, 128);
  if (edge < 3 || edge > 125) return [75, 45, 27];
  const warp = 10 * Math.sin(2 * Math.PI * y / SIZE) + 3 * Math.sin(6 * Math.PI * y / SIZE);
  const ring = Math.sin(2 * Math.PI * (40 * x + warp) / SIZE) * 9;
  const tone = hash(plank, 0, 41) * 31 + (noise(x, y, 8, 42) - 0.5) * 17;
  return [clamp(130 + tone + ring), clamp(87 + tone * 0.7 + ring * 0.6),
    clamp(49 + tone * 0.45 + ring * 0.35)];
}

function tile(x, y, porcelain) {
  const edge = Math.min(x, SIZE - x, y, SIZE - y);
  if (edge < 6) return porcelain ? [196, 193, 185] : [127, 130, 130];
  const cloud = (noise(x, y, porcelain ? 6 : 12, porcelain ? 52 : 51) - 0.5) * (porcelain ? 14 : 27);
  if (porcelain) {
    const vein = Math.abs(Math.sin(2 * Math.PI * (x + 0.28 * y) / SIZE * 2 + noise(x, y, 8, 53) * 2));
    const mark = vein > 0.985 ? -20 : 0;
    return [clamp(237 + cloud + mark), clamp(235 + cloud + mark), clamp(229 + cloud + mark)];
  }
  return [clamp(163 + cloud), clamp(169 + cloud), clamp(170 + cloud)];
}

function carpet(x, y) {
  const grain = (hash(x, y, 61) - 0.5) * 68;
  const fiber = hash(x + 1, y + 2, 62) > 0.91 ? 18 : 0;
  const cloud = (noise(x, y, 32, 63) - 0.5) * 24;
  return [clamp(65 + grain * 0.48 + cloud), clamp(105 + grain * 0.7 + cloud + fiber),
    clamp(127 + grain + cloud + fiber)];
}

const patterns = [
  ['walls/ladrillo-grande-v1', (x, y) => brick(x, y, false)],
  ['walls/ladrillo-pequeno-v1', (x, y) => brick(x, y, true)],
  ['walls/concreto-v1', concrete],
  ['walls/piedra-v1', stone],
  ['floors/madera-v1', wood],
  ['floors/baldosa-v1', (x, y) => tile(x, y, false)],
  ['floors/porcelanato-v1', (x, y) => tile(x, y, true)],
  ['floors/alfombra-v1', carpet],
];

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function chunk(type, data) {
  const header = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([header, data])) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, header, data, checksum]);
}

function png(size, pattern) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 3 + 1);
    for (let x = 0; x < size; x += 1) {
      const color = pattern(x * SIZE / size, y * SIZE / size);
      for (let channel = 0; channel < 3; channel += 1) raw[row + 1 + x * 3 + channel] = color[channel];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

for (const [basename, pattern] of patterns) {
  const folder = path.dirname(path.join(root, basename));
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(root, `${basename}.png`), png(512, pattern), { flag: 'wx' });
  await writeFile(path.join(root, `${basename}-preview.png`), png(128, pattern), { flag: 'wx' });
}
