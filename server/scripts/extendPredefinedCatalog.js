// Generate original, repeatable architectural patterns. Existing files are immutable.
// Re-running this script only verifies the catalog; it never replaces an asset.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = fileURLToPath(new URL('../assets/special-finishes/predefined/', import.meta.url));
const size = 512;
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const mod = (v, n) => ((v % n) + n) % n;
const mix = (a, b, t) => a + (b - a) * t;
const hash = (x, y, seed = 0) => {
  let n = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1442695041, 2246822519) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
function noise(x, y, cells, seed) {
  const px = x / size * cells, py = y / size * cells;
  const ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const h = (dx, dy) => hash(mod(ix + dx, cells), mod(iy + dy, cells), seed);
  return mix(mix(h(0, 0), h(1, 0), sx), mix(h(0, 1), h(1, 1), sx), sy);
}
function color(base, change) { return base.map((v, i) => clamp(v + change * [1, 0.94, 0.86][i])); }

function brick(base, rows, columns, seed, style = 'regular') {
  const h = size / rows, w = size / columns;
  return (x, y) => {
    const row = Math.floor(y / h), offset = row % 2 ? w / 2 : 0;
    const bx = mod(x + offset, w), by = mod(y, h);
    const width = style === 'industrial' ? 6 : style === 'aged' ? 7 : 5;
    const edge = Math.min(bx, w - bx, by, h - by);
    const chip = style === 'aged' ? (noise(x, y, 32, seed + 3) - 0.5) * 6 : 0;
    if (edge + chip < width) return style === 'industrial' ? [65, 67, 68] : [188, 184, 176];
    const index = Math.floor((x + offset) / w);
    const variation = (hash(mod(index, columns), mod(row, rows), seed) - 0.5) * 35
      + (noise(x, y, 32, seed + 1) - 0.5) * (style === 'aged' ? 52 : 22)
      + (hash(Math.floor(x / 4), Math.floor(y / 4), seed + 2) - 0.5) * 9;
    const scorch = style === 'industrial' ? -22 * Math.abs(Math.sin(2 * Math.PI * bx / w)) : 0;
    return color(base, variation + scorch);
  };
}

function stone(base, cells, seed, style = 'irregular') {
  const cell = size / cells;
  return (x, y) => {
    const ix = Math.floor(x / cell), iy = Math.floor(y / cell);
    let first = Infinity, second = Infinity, stoneX = 0, stoneY = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx, cy = iy + dy;
      const px = (cx + 0.5 + (hash(mod(cx, cells), mod(cy, cells), seed) - 0.5) * 0.62) * cell;
      const py = (cy + 0.5 + (hash(mod(cx, cells), mod(cy, cells), seed + 1) - 0.5) * 0.62) * cell;
      const distance = Math.hypot(x - px, y - py);
      if (distance < first) { second = first; first = distance; stoneX = mod(cx, cells); stoneY = mod(cy, cells); }
      else if (distance < second) second = distance;
    }
    const joint = style === 'laja' ? 4 : 7;
    if (second - first < joint) return color(base, -65);
    const block = (hash(stoneX, stoneY, seed + 2) - 0.5) * (style === 'decorative' ? 70 : 45);
    const grain = (noise(x, y, 24, seed + 3) - 0.5) * 28;
    const strata = style === 'laja' ? 9 * Math.sin(2 * Math.PI * (y * 24 / size + noise(x, y, 8, seed + 4) * 0.4)) : 0;
    return color(base, block + grain + strata);
  };
}

function concrete(base, seed, style = 'smooth') {
  return (x, y) => {
    const cloud = (noise(x, y, style === 'textured' ? 16 : 6, seed) - 0.5) *
      (style === 'polished' ? 12 : 30);
    const grain = (noise(x, y, 64, seed + 1) - 0.5) * (style === 'textured' ? 37 : 10);
    const pores = hash(x, y, seed + 2) > 0.996 ? -32 : 0;
    const board = style === 'formwork' ? Math.min(mod(y, 128), 128 - mod(y, 128)) < 3 ? -19 : 0 : 0;
    return color(base, cloud + grain + pores + board);
  };
}

function ceramic(base, seed, style = 'square') {
  return (x, y) => {
    const w = style === 'subway' ? 256 : style === 'mosaic' ? 64 : 128;
    const h = style === 'subway' ? 128 : w;
    const offset = style === 'subway' && Math.floor(y / h) % 2 ? w / 2 : 0;
    const bx = mod(x + offset, w), by = mod(y, h);
    const edge = Math.min(bx, w - bx, by, h - by);
    if (edge < 4) return color(base, -55);
    const cloud = (noise(x, y, 12, seed) - 0.5) * 13;
    if (style === 'geometric') {
      const cx = bx - w / 2, cy = by - h / 2;
      const diamond = Math.abs(cx) + Math.abs(cy);
      return color(base, cloud + (Math.abs(diamond - w * 0.46) < 8 ? -65 : diamond < w * 0.46 ? -17 : 10));
    }
    if (style === 'hydraulic') {
      const ring = Math.hypot(bx - w / 2, by - h / 2);
      return color(base, cloud + (Math.abs(ring - w * 0.32) < 9 ? -57 : 0));
    }
    return color(base, cloud + (hash(Math.floor(x / w), Math.floor(y / h), seed + 1) - 0.5) * 12);
  };
}

function wood(base, seed, style = 'plank') {
  const w = style === 'panel' ? 64 : style === 'narrow' ? 128 : 256;
  return (x, y) => {
    const plank = Math.floor(x / w), bx = mod(x, w);
    if (bx < (style === 'groove' ? 9 : 3)) return color(base, -57);
    const bend = 8 * Math.sin(2 * Math.PI * y / size) + 4 * Math.sin(4 * Math.PI * y / size);
    const grain = 12 * Math.sin(2 * Math.PI * (x * 24 / size + bend / size))
      + 7 * Math.sin(2 * Math.PI * (x * 50 / size + bend / size));
    const knots = style === 'natural' ? -35 * Math.max(0, 1 - Math.hypot(bx - w / 2, mod(y, 256) - 128) / 38) : 0;
    const tone = (hash(plank, 0, seed) - 0.5) * 33 + (noise(x, y, 12, seed + 1) - 0.5) * 12;
    return color(base, grain + tone + knots);
  };
}

function carpet(base, seed, modular = false) {
  return (x, y) => {
    const edge = modular && Math.min(mod(x, 256), 256 - mod(x, 256), mod(y, 256), 256 - mod(y, 256)) < 3;
    const tuft = (hash(x, y, seed) - 0.5) * 55 + (noise(x, y, 32, seed + 1) - 0.5) * 22;
    const weave = modular ? (Math.floor(x / 256) + Math.floor(y / 256)) % 2 ? -10 : 10 : 0;
    return color(base, tuft + weave + (edge ? -30 : 0));
  };
}

function cladding(base, seed, style) {
  return (x, y) => {
    if (style === 'acoustic') return color(base, ((Math.floor(x / 32) + Math.floor(y / 32)) % 2 ? -23 : 12)
      + (noise(x, y, 32, seed) - 0.5) * 21);
    if (style === 'textile') return color(base, (hash(x, y, seed) - 0.5) * 35
      + (Math.sin(2 * Math.PI * x / 8) + Math.sin(2 * Math.PI * y / 8)) * 6);
    return color(base, (noise(x, y, 12, seed) - 0.5) * 36
      + (style === 'stucco' ? (hash(x, y, seed + 1) - 0.5) * 28 : 0));
  };
}

// Four existing wall and four floor entries keep their IDs, revisions and bytes.
// Each tuple: name, scope, subcategory, suggested metres, filename, original pattern.
const specifications = [
  ['Ladrillo blanco', 'WALL', 'BRICK', .24, 'ladrillo-blanco', brick([224, 219, 207], 4, 2, 101)],
  ['Ladrillo gris', 'WALL', 'BRICK', .24, 'ladrillo-gris', brick([131, 134, 134], 4, 2, 106)],
  ['Ladrillo industrial', 'WALL', 'BRICK', .28, 'ladrillo-industrial', brick([132, 59, 45], 4, 2, 111, 'industrial')],
  ['Ladrillo envejecido', 'WALL', 'BRICK', .24, 'ladrillo-envejecido', brick([165, 115, 83], 4, 2, 116, 'aged')],
  ['Piedra clara', 'WALL', 'STONE', .5, 'piedra-clara', stone([202, 199, 179], 4, 121)],
  ['Piedra oscura', 'WALL', 'STONE', .5, 'piedra-oscura', stone([93, 98, 96], 4, 126)],
  ['Piedra tipo laja', 'WALL', 'STONE', .4, 'piedra-laja', stone([147, 139, 125], 6, 131, 'laja')],
  ['Piedra decorativa', 'WALL', 'STONE', .32, 'piedra-decorativa', stone([188, 161, 125], 8, 136, 'decorative')],
  ['Concreto claro', 'WALL', 'CONCRETE', .75, 'concreto-claro', concrete([218, 218, 213], 141)],
  ['Concreto oscuro', 'WALL', 'CONCRETE', .75, 'concreto-oscuro', concrete([85, 88, 89], 146)],
  ['Concreto arquitectónico', 'WALL', 'CONCRETE', .75, 'concreto-arquitectonico', concrete([159, 161, 158], 151, 'formwork')],
  ['Cerámica blanca', 'WALL', 'CERAMIC', .16, 'ceramica-blanca', ceramic([239, 237, 231], 156)],
  ['Cerámica gris', 'WALL', 'CERAMIC', .16, 'ceramica-gris', ceramic([166, 173, 174], 161)],
  ['Revestimiento subway', 'WALL', 'CERAMIC', .24, 'revestimiento-subway', ceramic([227, 230, 225], 166, 'subway')],
  ['Revestimiento geométrico', 'WALL', 'CERAMIC', .2, 'revestimiento-geometrico', ceramic([187, 200, 197], 171, 'geometric')],
  ['Roble claro', 'WALL', 'WOOD', .2, 'roble-claro', wood([190, 150, 101], 176, 'narrow')],
  ['Nogal', 'WALL', 'WOOD', .25, 'nogal', wood([103, 69, 45], 181, 'natural')],
  ['Madera gris', 'WALL', 'WOOD', .22, 'madera-gris', wood([139, 138, 129], 186, 'plank')],
  ['Madera natural', 'WALL', 'WOOD', .25, 'madera-natural', wood([160, 111, 70], 191, 'natural')],
  ['Panel ranurado', 'WALL', 'CLADDING', .32, 'panel-ranurado', wood([158, 120, 79], 196, 'groove')],
  ['Panel acústico', 'WALL', 'CLADDING', .5, 'panel-acustico', cladding([108, 112, 107], 201, 'acoustic')],
  ['Estuco', 'WALL', 'CLADDING', .7, 'estuco', cladding([224, 216, 200], 206, 'stucco')],
  ['Roble natural', 'FLOOR', 'WOOD', .25, 'roble-natural', wood([173, 130, 81], 211, 'natural')],
  ['Roble oscuro', 'FLOOR', 'WOOD', .24, 'roble-oscuro', wood([101, 69, 43], 216, 'narrow')],
  ['Porcelanato gris oscuro', 'FLOOR', 'PORCELAIN', .6, 'porcelanato-gris-oscuro', ceramic([96, 101, 101], 221)],
  ['Porcelanato beige', 'FLOOR', 'PORCELAIN', .6, 'porcelanato-beige', ceramic([209, 192, 164], 226)],
  ['Baldosa hidráulica', 'FLOOR', 'TILE', .2, 'baldosa-hidraulica', ceramic([152, 170, 167], 231, 'hydraulic')],
  ['Baldosa pequeña', 'FLOOR', 'TILE', .12, 'baldosa-pequena', ceramic([215, 209, 194], 236, 'mosaic')],
  ['Alfombra gris', 'FLOOR', 'CARPET', .6, 'alfombra-gris', carpet([117, 120, 121], 241)],
  ['Alfombra modular', 'FLOOR', 'CARPET', .5, 'alfombra-modular', carpet([88, 99, 110], 246, true)],
  ['Travertino', 'FLOOR', 'STONE', .6, 'travertino', stone([209, 194, 159], 4, 251, 'laja')],
  ['Microcemento', 'FLOOR', 'CONCRETE', .75, 'microcemento', concrete([171, 170, 163], 256, 'polished')],
];

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function chunk(type, data) {
  const header = Buffer.from(type, 'ascii'), length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([header, data])) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, header, data, checksum]);
}
function png(dimension, pattern) {
  const raw = Buffer.alloc(dimension * (dimension * 3 + 1));
  for (let y = 0; y < dimension; y++) for (let x = 0; x < dimension; x++) {
    const rgb = pattern(x * size / dimension, y * size / dimension);
    const at = y * (dimension * 3 + 1) + 1 + x * 3;
    for (let channel = 0; channel < 3; channel++) raw[at + channel] = rgb[channel];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(dimension, 0); ihdr.writeUInt32BE(dimension, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const manifestPath = path.join(root, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const originalCategories = ['BRICK', 'BRICK', 'CONCRETE', 'STONE', 'WOOD', 'TILE', 'PORCELAIN', 'CARPET'];
for (const [index, item] of manifest.items.slice(0, 8).entries()) {
  item.subcategory = originalCategories[index];
  item.origin = 'GENERATED_LOCALLY';
  item.license = 'Proyecto Imagina original';
}
const existing = new Set(manifest.items.map((item) => item.id));
for (const [index, [name, category, subcategory, suggestedTileWidth, slug, pattern]] of specifications.entries()) {
  const suffix = String(index + 1).padStart(12, '0');
  const id = `6c4f0002-7a3b-4d2f-8b1c-${suffix}`;
  if (existing.has(id)) continue;
  const directory = category === 'WALL' ? 'walls' : 'floors';
  const image = `${directory}/${slug}-v1.png`, preview = `${directory}/${slug}-v1-preview.png`;
  await mkdir(path.join(root, directory), { recursive: true });
  await writeFile(path.join(root, image), png(512, pattern), { flag: 'wx' });
  await writeFile(path.join(root, preview), png(128, pattern), { flag: 'wx' });
  manifest.items.push({ id, name, category, subcategory,
    compatibleScopes: category === 'WALL' ? ['WALL', 'COLUMN'] : ['FLOOR'],
    suggestedTileWidth, origin: 'GENERATED_LOCALLY', license: 'Proyecto Imagina original',
    revisions: [{ revision: 1, assetId: `6c4f1002-7a3b-4d2f-8b1c-${suffix}`,
      assetVersion: 1, image, preview }] });
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
