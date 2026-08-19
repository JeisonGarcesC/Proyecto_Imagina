// src/utils/planExport.js
import { FOOTPRINT2D_TYPES } from '../plan2d/footprint2D.js';
import {
  buildDetailedFootprintWorldShapes,
  buildFootprintWorldGeometry,
} from '../plan2d/footprintGeometry2D.js';
import {
  is2DDetailEnabled,
  normalizeDetailed2DIds,
} from '../plan2d/detailSelection2D.js';
import { buildColumnGeometry2D } from '../core/architecture/columns/columnGeometry2D.js';
import { COLUMN_SHAPES } from '../core/architecture/columns/columnDefinition.js';
import { buildDoorGeometry2D } from '../core/architecture/openings/doorGeometry2D.js';

function safeNum(n, fallback = 0) {
  return Number.isFinite(n) ? n : fallback;
}

function boundsFromData(parts = [], walls = [], columns = [], openings = []) {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;

  for (const p of parts) {
    const geometry = buildFootprintWorldGeometry(p);
    const vertices = geometry?.vertices || [];
    if (vertices.length >= 3) {
      vertices.forEach((point) => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minZ = Math.min(minZ, point.z);
        maxZ = Math.max(maxZ, point.z);
      });
    } else {
      const x = safeNum(p.x);
      const z = safeNum(p.z);
      const w = Math.max(0, safeNum(p.w));
      const d = Math.max(0, safeNum(p.d));
      minX = Math.min(minX, x - w / 2);
      maxX = Math.max(maxX, x + w / 2);
      minZ = Math.min(minZ, z - d / 2);
      maxZ = Math.max(maxZ, z + d / 2);
    }
  }

  for (const w of walls || []) {
    for (const pt of w?.points || []) {
      minX = Math.min(minX, safeNum(pt.x));
      maxX = Math.max(maxX, safeNum(pt.x));
      minZ = Math.min(minZ, safeNum(pt.z));
      maxZ = Math.max(maxZ, safeNum(pt.z));
    }
  }

  for (const column of columns || []) {
    if (column?.visible === false) continue;
    const bounds = buildColumnGeometry2D(column).bounds;
    minX = Math.min(minX, bounds.minX);
    maxX = Math.max(maxX, bounds.maxX);
    minZ = Math.min(minZ, bounds.minZ);
    maxZ = Math.max(maxZ, bounds.maxZ);
  }

  for (const opening of openings || []) {
    if (opening?.visible === false) continue;
    const geometry = buildDoorGeometry2D(opening, walls, openings);
    if (!geometry?.valid) continue;
    [geometry.hinge, geometry.closedEnd, geometry.openEnd].forEach((point) => {
      minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z); maxZ = Math.max(maxZ, point.z);
    });
  }

  if (!isFinite(minX)) {
    minX = -1;
    maxX = 1;
    minZ = -1;
    maxZ = 1;
  }

  return { minX, maxX, minZ, maxZ };
}

function fmtMeters(m) {
  if (!isFinite(m)) return '';
  const r2 = Math.round(m * 100) / 100;
  const r0 = Math.round(m);
  return Math.abs(r2 - r0) < 0.005 ? `${r0} m` : `${r2.toFixed(2)} m`;
}

export function generatePlanSvg({
  parts = [],
  walls = [],
  columns = [],
  openings = [],
  pxPerM = 140,
  paddingM = 0.25,
  includeDims = true,
  title = 'Planta 2D',
  detailed2DIds = [],
} = {}) {
  const detailIds = normalizeDetailed2DIds(detailed2DIds);
  const b = boundsFromData(parts, walls, columns, openings);
  const pad = paddingM;
  const minX = b.minX - pad;
  const maxX = b.maxX + pad;
  const minZ = b.minZ - pad;
  const maxZ = b.maxZ + pad;

  const spanX = Math.max(0.001, maxX - minX);
  const spanZ = Math.max(0.001, maxZ - minZ);
  const W = Math.ceil(spanX * pxPerM);
  const H = Math.ceil(spanZ * pxPerM);

  // world -> svg (Y hacia abajo). Usamos Z invertido para que arriba sea +Z.
  const X = (x) => (x - minX) * pxPerM;
  const Y = (z) => (maxZ - z) * pxPerM;

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const wallEls = (walls || [])
    .map((w) => {
      const pts = w?.points || [];
      if (pts.length < 2) return '';
      const sw = Math.max(1, (w.thickness || 0.1) * pxPerM);
      const d = pts
        .map((pt, i) => {
          const x = X(pt.x);
          const y = Y(pt.z);
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ');

      let dims = '';
      if (includeDims) {
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i];
          const b2 = pts[i + 1];
          const dx = b2.x - a.x;
          const dz = b2.z - a.z;
          const len = Math.sqrt(dx * dx + dz * dz);
          const mx = (a.x + b2.x) / 2;
          const mz = (a.z + b2.z) / 2;
          const ang = (Math.atan2(-(b2.z - a.z), b2.x - a.x) * 180) / Math.PI; // en SVG, Y invertida
          const tx = X(mx);
          const ty = Y(mz);
          const label = fmtMeters(len);
          dims += `\n  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) rotate(${ang.toFixed(2)})">
    <rect x="${(-label.length * 3.1 - 6).toFixed(2)}" y="-9" width="${(label.length * 6.2 + 12).toFixed(2)}" height="18" rx="4" fill="rgba(255,255,255,0.85)" />
    <text x="0" y="0" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="rgba(0,0,0,0.75)">${esc(label)}</text>
  </g>`;
        }
      }

      return `
  <path d="${d}" fill="none" stroke="rgba(20,20,20,0.75)" stroke-width="${sw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />${dims}`;
    })
    .join('');

  const partEls = (parts || [])
    .map((p) => {
      const geometry = buildFootprintWorldGeometry(p);
      const cx = X(p.x);
      const cy = Y(p.z);
      const w = Math.max(0.01, safeNum(p.w)) * pxPerM;
      const d = Math.max(0.01, safeNum(p.d)) * pxPerM;
      const rot = (-safeNum(p.rotY, 0) * 180) / Math.PI;
      const id = p.id ? esc(p.id) : '';
      const detailedShapes = is2DDetailEnabled(p, detailIds)
        ? buildDetailedFootprintWorldShapes(p)
        : [];
      if (detailedShapes.length) {
        const shapes = detailedShapes
          .map((detailedShape) => {
            const points = detailedShape.points
              .map((point) => `${X(point.x).toFixed(2)},${Y(point.z).toFixed(2)}`)
              .join(' ');
            const tag = detailedShape.closed ? 'polygon' : 'polyline';
            return `<${tag} points="${points}" fill="${detailedShape.closed ? 'rgba(0,0,0,0.08)' : 'none'}" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`;
          })
          .join('\n  ');
        return `
  ${shapes}
  ${id ? `<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="rgba(0,0,0,0.55)">${id}</text>` : ''}`;
      }
      let shape = `<rect x="${(-w / 2).toFixed(2)}" y="${(-d / 2).toFixed(2)}" width="${w.toFixed(2)}" height="${d.toFixed(2)}" fill="rgba(0,0,0,0.08)" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`;

      if (geometry && !geometry.fallback) {
        if (
          geometry.type === FOOTPRINT2D_TYPES.POLYGON ||
          geometry.type === FOOTPRINT2D_TYPES.TRIANGLE
        ) {
          const points = geometry.vertices
            .map((point) => `${X(point.x).toFixed(2)},${Y(point.z).toFixed(2)}`)
            .join(' ');
          shape = `<polygon points="${points}" fill="rgba(0,0,0,0.08)" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`;
        } else if (
          geometry.type === FOOTPRINT2D_TYPES.CIRCLE ||
          geometry.type === FOOTPRINT2D_TYPES.ELLIPSE
        ) {
          const radiusX = geometry.radii.x * pxPerM;
          const radiusZ = geometry.radii.z * pxPerM;
          const isCircle = Math.abs(radiusX - radiusZ) <= 1e-6;
          shape = isCircle
            ? `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${radiusX.toFixed(2)}" fill="rgba(0,0,0,0.08)" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`
            : `<ellipse cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${radiusX.toFixed(2)}" ry="${radiusZ.toFixed(2)}" transform="rotate(${rot.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)})" fill="rgba(0,0,0,0.08)" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`;
        }
      }

      if (shape.startsWith('<polygon') || shape.startsWith('<circle') || shape.startsWith('<ellipse')) {
        return `
  ${shape}
  ${id ? `<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="rgba(0,0,0,0.55)">${id}</text>` : ''}`;
      }
      return `
  <g transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${rot.toFixed(2)})">
    ${shape}
    ${id ? `<text x="0" y="0" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="rgba(0,0,0,0.55)">${id}</text>` : ''}
  </g>`;
    })
    .join('');

  const columnEls = (columns || [])
    .filter((column) => column?.visible !== false)
    .map((column) => {
      const geometry = buildColumnGeometry2D(column);
      if (geometry.shape === COLUMN_SHAPES.CIRCLE) {
        return `<circle cx="${X(geometry.center.x).toFixed(2)}" cy="${Y(geometry.center.z).toFixed(2)}" r="${(geometry.radius * pxPerM).toFixed(2)}" fill="rgba(70,70,70,0.22)" stroke="rgba(30,30,30,0.8)" stroke-width="1" />`;
      }
      const points = geometry.polygon.map((point) => `${X(point.x).toFixed(2)},${Y(point.z).toFixed(2)}`).join(' ');
      return `<polygon points="${points}" fill="rgba(70,70,70,0.22)" stroke="rgba(30,30,30,0.8)" stroke-width="1" />`;
    })
    .join('\n  ');

  const doorEls = (openings || []).filter((opening) => opening?.visible !== false).map((opening) => {
    const geometry = buildDoorGeometry2D(opening, walls, openings);
    if (!geometry?.valid) return '';
    const hx = X(geometry.hinge.x); const hy = Y(geometry.hinge.z);
    const ox = X(geometry.openEnd.x); const oy = Y(geometry.openEnd.z);
    const cx = X(geometry.closedEnd.x); const cy = Y(geometry.closedEnd.z);
    const sweep = geometry.arc.counterClockwise ? 0 : 1;
    const gapWidth = Math.max(2, geometry.thickness * pxPerM + 2);
    return `<g class="door" data-opening-id="${esc(opening.id)}">
      <line x1="${X(geometry.jambs[0].x).toFixed(2)}" y1="${Y(geometry.jambs[0].z).toFixed(2)}" x2="${X(geometry.jambs[1].x).toFixed(2)}" y2="${Y(geometry.jambs[1].z).toFixed(2)}" stroke="#fff" stroke-width="${gapWidth.toFixed(2)}" />
      <line x1="${hx.toFixed(2)}" y1="${hy.toFixed(2)}" x2="${ox.toFixed(2)}" y2="${oy.toFixed(2)}" stroke="#555" stroke-width="1.5" />
      <path d="M ${cx.toFixed(2)} ${cy.toFixed(2)} A ${(geometry.arc.radius * pxPerM).toFixed(2)} ${(geometry.arc.radius * pxPerM).toFixed(2)} 0 0 ${sweep} ${ox.toFixed(2)} ${oy.toFixed(2)}" fill="none" stroke="#777" stroke-width="1" />
    </g>`;
  }).join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff" />
  <text x="12" y="18" font-size="14" fill="rgba(0,0,0,0.65)">${esc(title)}</text>
  ${wallEls}
  ${doorEls}
  ${columnEls}
  ${partEls}
</svg>`;
}

export function downloadTextFile(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export async function exportSvgToPng(svgText, { scale = 2, filename = 'planta.png' } = {}) {
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.decoding = 'async';
    const loaded = new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
    });
    img.src = url;
    await loaded;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(img.width * scale));
    canvas.height = Math.max(1, Math.floor(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo obtener contexto 2D');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pngBlob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function printSvgAsPdf(svgText, { title = 'Planta 2D' } = {}) {
  // Abre una ventana con el SVG y dispara impresión (Guardar como PDF)
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(`<!doctype html><html><head><title>${title}</title>
    <style>
      @page { margin: 10mm; }
      body { margin: 0; font-family: sans-serif; }
      svg { width: 100%; height: auto; }
    </style>
  </head><body>${svgText}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 200);
}
