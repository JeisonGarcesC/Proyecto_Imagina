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
import { resolveDimensionScreenGeometry, resolveDimensionTextPosition } from '../plan2d/dimensionGeometry2D.js';
import { formatDimensionValue } from '../plan2d/dimensionFormat.js';
import { areaLabelPoint, formatArea } from '../plan2d/areaMeasurement.js';
import { areaSegmentLabelLayout, circleMeasurementLabels } from '../plan2d/areaMeasurementVisual.js';
import { transformShapeToCanvas } from '../plan2d/geometry2D/geometryUtils2D.js';
import { worldToCanvas2D } from '../plan2d/worldToCanvas2D.js';

function safeNum(n, fallback = 0) {
  return Number.isFinite(n) ? n : fallback;
}

export function get2DDisplayLabel(object) {
  const label = typeof object?.displayLabel === 'string' ? object.displayLabel.trim() : '';
  if (!label || [object.id, object.instanceId, object.groupId, object.assemblyId].includes(label)) return '';
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(label) || /^[A-Z0-9]+_\d{10,}_[A-Z0-9]+$/i.test(label)) return '';
  return label;
}

export function boundsFromData(parts = [], walls = [], columns = [], openings = [], dimensions = [], areaMeasurements = [], shapes2D = [], texts2D = [], pxPerM = 140, invertZ = true) {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;

  for (const p of parts) {
    const geometry = buildFootprintWorldGeometry(p);
    const vertices = geometry?.vertices || [];
    const detailedShapes = buildDetailedFootprintWorldShapes(p, 4);
    for (const shape of detailedShapes) {
      for (const point of shape.points || []) {
        minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
        minZ = Math.min(minZ, point.z); maxZ = Math.max(maxZ, point.z);
      }
    }
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
    const radius = Number(geometry.arc?.radius) || 0;
    minX = Math.min(minX, geometry.hinge.x - radius); maxX = Math.max(maxX, geometry.hinge.x + radius);
    minZ = Math.min(minZ, geometry.hinge.z - radius); maxZ = Math.max(maxZ, geometry.hinge.z + radius);
  }

  const includePoint = (x, z) => {
    if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(z))) return;
    minX = Math.min(minX, Number(x)); maxX = Math.max(maxX, Number(x));
    minZ = Math.min(minZ, Number(z)); maxZ = Math.max(maxZ, Number(z));
  };
  for (const dimension of dimensions || []) {
    if (!dimension?.startPoint || !dimension?.endPoint) continue;
    const zSign = invertZ ? -1 : 1;
    const toWorldPixels = (x, z) => [x * pxPerM, zSign * z * pxPerM];
    const geometry = resolveDimensionScreenGeometry(dimension, toWorldPixels);
    const text = resolveDimensionTextPosition(dimension, toWorldPixels);
    for (const [x, y] of [geometry.start, geometry.end, geometry.dimStart, geometry.dimEnd, [text.x, text.y]]) {
      includePoint(x / pxPerM, zSign * y / pxPerM);
    }
  }
  for (const area of areaMeasurements || []) {
    if (area?.type === 'CIRCLE' && area.center) {
      includePoint(area.center.x - area.radius, area.center.z - area.radius);
      includePoint(area.center.x + area.radius, area.center.z + area.radius);
      includePoint(area.center.x + area.radius + 210 / pxPerM, area.center.z);
    } else for (const point of area?.points || []) includePoint(point.x, point.z);
  }
  for (const shape of shapes2D || []) {
    if (shape?.visible === false) continue;
    const g = transformShapeToCanvas(shape, { toCanvas: (x, y) => [x, y], scale: 1, rotationSign: 1 });
    if (!g) continue;
    if (g.points) g.points.forEach(([x, y]) => includePoint(x, y));
    else if (g.x1 != null) { includePoint(g.x1, g.y1); includePoint(g.x2, g.y2); }
    else if (g.radius != null) { includePoint(g.x - g.radius, g.y - g.radius); includePoint(g.x + g.radius, g.y + g.radius); }
    else {
      const radius = Math.hypot(g.width || 0, g.height || 0) / 2;
      includePoint(g.x - radius, g.y - radius); includePoint(g.x + radius, g.y + radius);
      if (shape.type === 'elevation') includePoint(g.x + (g.width || 0) / 2 + 42 / pxPerM, g.y + 30 / pxPerM);
    }
  }
  for (const item of texts2D || []) {
    if (item?.visible === false) continue;
    const size = Number(item.style?.fontSize) || 0.2;
    const width = Math.max(size, ...String(item.text || '').split('\n').map((line) => line.length * size * 0.7));
    includePoint(item.geometry.x - width, item.geometry.y - size);
    includePoint(item.geometry.x + width, item.geometry.y + size);
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
  const r3 = Math.round(m * 1000) / 1000;
  const r0 = Math.round(m);
  return Math.abs(r3 - r0) < 0.0005 ? `${r0} m` : `${r3.toFixed(3)} m`;
}

export function generatePlanSvg({
  parts = [],
  walls = [],
  columns = [],
  openings = [],
  dimensions = [],
  areaMeasurements = [],
  shapes2D = [],
  texts2D = [],
  invertZ = true,
  pxPerM = 140,
  paddingM = 0.25,
  includeDims = true,
  title = 'Planta 2D',
  detailed2DIds = [],
  detailLevel = 3,
  detailAll = false,
} = {}) {
  const detailIds = normalizeDetailed2DIds(detailed2DIds);
  const b = boundsFromData(parts, walls, columns, openings, dimensions, areaMeasurements, shapes2D, texts2D, pxPerM, invertZ);
  const pad = paddingM;
  const minX = b.minX - pad;
  const maxX = b.maxX + pad;
  const minZ = b.minZ - pad;
  const maxZ = b.maxZ + pad;

  const spanX = Math.max(0.001, maxX - minX);
  const spanZ = Math.max(0.001, maxZ - minZ);
  const W = Math.ceil(spanX * pxPerM);
  const H = Math.ceil(spanZ * pxPerM);

  const toSvg = (x, z) => worldToCanvas2D(x, z, {
    centerX: (minX + maxX) / 2, centerZ: (minZ + maxZ) / 2,
    scale: pxPerM, width: W, height: H, invertZ,
  });
  const X = (x) => toSvg(x, 0)[0];
  const Y = (z) => toSvg(0, z)[1];

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
      const label = esc(get2DDisplayLabel(p));
      const detailedShapes = detailLevel > 1 && (detailAll || is2DDetailEnabled(p, detailIds))
        ? buildDetailedFootprintWorldShapes(p, detailLevel)
        : [];
      const addNormalOutline = detailLevel === 4 && detailedShapes.length > 0;
      const normalFill = addNormalOutline ? 'none' : 'rgba(0,0,0,0.08)';
      const detailMarkup = detailedShapes
        .map((detailedShape) => {
          const points = detailedShape.points
            .map((point) => `${X(point.x).toFixed(2)},${Y(point.z).toFixed(2)}`)
            .join(' ');
          const tag = detailedShape.closed ? 'polygon' : 'polyline';
          return `<${tag} points="${points}" fill="${detailLevel >= 3 && detailedShape.closed ? 'rgba(0,0,0,0.08)' : 'none'}" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`;
        })
        .join('\n  ');
      if (detailedShapes.length && detailLevel === 3) {
        return `
  ${detailMarkup}
  ${label ? `<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="rgba(0,0,0,0.55)">${label}</text>` : ''}`;
      }
      let shape = `<rect x="${(-w / 2).toFixed(2)}" y="${(-d / 2).toFixed(2)}" width="${w.toFixed(2)}" height="${d.toFixed(2)}" fill="${normalFill}" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`;

      if (geometry && !geometry.fallback) {
        if (
          geometry.type === FOOTPRINT2D_TYPES.POLYGON ||
          geometry.type === FOOTPRINT2D_TYPES.TRIANGLE
        ) {
          const points = geometry.vertices
            .map((point) => `${X(point.x).toFixed(2)},${Y(point.z).toFixed(2)}`)
            .join(' ');
          shape = `<polygon points="${points}" fill="${normalFill}" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`;
        } else if (
          geometry.type === FOOTPRINT2D_TYPES.CIRCLE ||
          geometry.type === FOOTPRINT2D_TYPES.ELLIPSE
        ) {
          const radiusX = geometry.radii.x * pxPerM;
          const radiusZ = geometry.radii.z * pxPerM;
          const isCircle = Math.abs(radiusX - radiusZ) <= 1e-6;
          shape = isCircle
            ? `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${radiusX.toFixed(2)}" fill="${normalFill}" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`
            : `<ellipse cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${radiusX.toFixed(2)}" ry="${radiusZ.toFixed(2)}" transform="rotate(${rot.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)})" fill="${normalFill}" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`;
        }
      }

      if (shape.startsWith('<polygon') || shape.startsWith('<circle') || shape.startsWith('<ellipse')) {
        return `
  ${shape}
  ${detailMarkup}
  ${label ? `<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="rgba(0,0,0,0.55)">${label}</text>` : ''}`;
      }
      return `
  <g transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${rot.toFixed(2)})">
    ${shape}
    ${label ? `<text x="0" y="0" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="rgba(0,0,0,0.55)">${label}</text>` : ''}
  </g>
  ${detailMarkup}`;
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

  const dimensionEls = (dimensions || []).filter((dimension) => dimension?.startPoint && dimension?.endPoint).map((dimension) => {
    const g = resolveDimensionScreenGeometry(dimension, toSvg);
    const position = resolveDimensionTextPosition(dimension, toSvg);
    const label = esc(dimension.label || formatDimensionValue(dimension.value, dimension.unit));
    const color = dimension.style?.color || '#111827';
    const points = [g.start, g.dimStart, g.dimEnd, g.end];
    return `<g class="dimension" stroke="${color}" fill="none" stroke-width="1">
      <path d="M ${points[0].join(' ')} L ${points[1].join(' ')} L ${points[2].join(' ')} M ${points[3].join(' ')} L ${points[2].join(' ')}" />
      <rect x="${position.x - label.length * 3.8 - 5}" y="${position.y - 9}" width="${label.length * 7.6 + 10}" height="18" fill="white" stroke="none" />
      <text x="${position.x}" y="${position.y}" text-anchor="middle" dominant-baseline="middle" font-size="${Number(dimension.style?.text?.size) || 14}" fill="${color}" stroke="none">${label}</text>
    </g>`;
  }).join('\n  ');

  const areaEls = (areaMeasurements || []).map((area) => {
    if (area?.type === 'CIRCLE' && area.center && Number(area.radius) > 0) {
      const [cx, cy] = toSvg(area.center.x, area.center.z);
      const radius = area.radius * pxPerM;
      const labels = circleMeasurementLabels(area);
      const boxWidth = Math.max(...labels.map((line) => line.length * 7.2)) + 16;
      const labelLayout = areaSegmentLabelLayout(area.center, { x: area.center.x + area.radius, z: area.center.z }, toSvg);
      return `<g class="area-measurement" stroke="#9333ea" fill="none"><circle cx="${cx}" cy="${cy}" r="${radius}" fill="rgba(168,85,247,0.13)" stroke-width="2" />
        <line x1="${cx}" y1="${cy}" x2="${cx + radius}" y2="${cy}" />
        <circle cx="${cx}" cy="${cy}" r="5" fill="#9333ea" />
        ${labelLayout ? `<text x="${labelLayout.x}" y="${labelLayout.y}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#9333ea" paint-order="stroke" stroke="white" stroke-width="4">${esc(labelLayout.label)}</text>` : ''}
        <rect x="${cx + radius + 12}" y="${cy - 36}" width="${boxWidth}" height="72" fill="rgba(255,255,255,0.94)" stroke="#9333ea" />
        ${labels.map((line, index) => `<text x="${cx + radius + 20}" y="${cy - 31 + index * 17}" font-size="12" fill="#9333ea" stroke="none">${esc(line)}</text>`).join('')}</g>`;
    }
    if (!Array.isArray(area?.points) || area.points.length < 3) return '';
    const points = area.points.map((point) => toSvg(point.x, point.z));
    const center = areaLabelPoint(area.points);
    const [lx, ly] = toSvg(center.x, center.z);
    const segments = area.points.map((point, index) => {
      const next = area.points[(index + 1) % area.points.length];
      const layout = areaSegmentLabelLayout(point, next, toSvg);
      return layout ? `<text x="${layout.x}" y="${layout.y}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#9333ea" paint-order="stroke" stroke="white" stroke-width="4">${esc(layout.label)}</text>` : '';
    }).join('');
    return `<g class="area-measurement"><polygon points="${points.map((point) => point.join(',')).join(' ')}" fill="rgba(168,85,247,0.13)" stroke="#9333ea" stroke-width="2" />
      ${points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#9333ea" />`).join('')}
      ${segments}<text x="${lx}" y="${ly}" text-anchor="middle" font-size="13" fill="#9333ea" paint-order="stroke" stroke="white" stroke-width="4">${esc(formatArea(area.area).squareMeters)}</text></g>`;
  }).join('\n  ');

  const shapeEls = (shapes2D || []).filter((shape) => shape?.visible !== false).map((shape) => {
    const g = transformShapeToCanvas(shape, { toCanvas: toSvg, scale: pxPerM });
    if (!g) return '';
    const stroke = shape.style?.stroke || '#111827';
    const fill = shape.style?.fill ? shape.style?.fillColor || 'none' : 'none';
    const attrs = `stroke="${stroke}" stroke-width="${shape.style?.strokeWidth || 1}" fill="${fill}"`;
    if (g.x1 != null) return `<line x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}" ${attrs} />`;
    if (g.points) return `<polygon points="${g.points.map((point) => point.join(',')).join(' ')}" ${attrs} />`;
    if (g.radius != null) return `<circle cx="${g.x}" cy="${g.y}" r="${g.radius}" ${attrs} />`;
    const shapeBody = shape.type === 'triangle'
      ? `<polygon points="0,${-g.height / 2} ${g.width / 2},${g.height / 2} ${-g.width / 2},${g.height / 2}" ${attrs} />`
      : `<rect x="${-g.width / 2}" y="${-g.height / 2}" width="${g.width}" height="${g.height}" ${attrs} />`;
    const elevationDetails = shape.type === 'elevation' ? `<g class="elevation-details" fill="none" stroke="${stroke}">
      ${(g.components || []).map((component) => `<rect x="${(component.x - component.width / 2) * pxPerM}" y="${(component.y - component.height / 2) * pxPerM}" width="${component.width * pxPerM}" height="${component.height * pxPerM}" />`).join('')}
      <circle cx="${g.width / 2 + 24}" cy="0" r="14" />
      <path d="M -14 14 L 0 26 L 14 14 Z" transform="translate(${g.width / 2 + 24} 0) rotate(${{ front: 0, back: 180, left: 90, right: -90 }[shape.viewDirection] || 0})" />
      <text x="${g.width / 2 + 24}" y="0" fill="${stroke}" stroke="none" text-anchor="middle" dominant-baseline="middle" font-size="12">${esc(shape.label || '')}</text>
    </g>` : '';
    return `<g transform="translate(${g.x} ${g.y}) rotate(${(g.rotation || 0) * 180 / Math.PI})">${shapeBody}${elevationDetails}</g>`;
  }).join('\n  ');

  const textEls = (texts2D || []).filter((item) => item?.visible !== false).map((item) => {
    const [x, y] = toSvg(item.geometry.x, item.geometry.y);
    const size = (Number(item.style?.fontSize) || 0.2) * pxPerM;
    const anchor = { left: 'start', center: 'middle', right: 'end' }[item.style?.align] || 'start';
    const lines = String(item.text || '').split('\n');
    return `<text x="${x}" y="${y}" transform="rotate(${(-Number(item.geometry.rotation || 0) * 180 / Math.PI)} ${x} ${y})" font-size="${size}" font-family="${esc(item.style?.fontFamily || 'Arial')}" fill="${item.style?.color || '#000'}" text-anchor="${anchor}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? -(lines.length - 1) * size * 0.6 : size * 1.2}">${esc(line)}</tspan>`).join('')}</text>`;
  }).join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff" />
  <text x="12" y="18" font-size="14" fill="rgba(0,0,0,0.65)">${esc(title)}</text>
  ${wallEls}
  ${doorEls}
  ${columnEls}
  ${partEls}
  ${shapeEls}
  ${textEls}
  ${dimensionEls}
  ${areaEls}
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
  const dimensions = svgText.match(/<svg[^>]*width="(\d+)" height="(\d+)"/);
  const landscape = dimensions && Number(dimensions[1]) > Number(dimensions[2]);
  w.document.write(`<!doctype html><html><head><title>${title}</title>
    <style>
      @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 10mm; }
      body { margin: 0; font-family: sans-serif; }
      svg { display: block; width: auto; height: auto; max-width: 100%; max-height: ${landscape ? '190mm' : '277mm'}; margin: auto; }
    </style>
  </head><body>${svgText}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 200);
}
