// src/utils/export/exportDXF.js
import Drawing from 'dxf-writer';
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
import { buildWallGeometry2D } from '../core/architecture/walls/wallGeometry2D.js';
import { buildDoorGeometry2D, splitWallSegmentIntervals } from '../core/architecture/openings/doorGeometry2D.js';

/**
 * Exporta planta 2D a DXF:
 * - walls[]: [{id, points:[{x,z}], thickness}]
 * - partsSnapshot[]: [{id, codigoPT, x, z, w, d, rotY}]
 */
export function generatePlanDxf({
  walls = [],
  columns = [],
  openings = [],
  partsSnapshot = [],
  detailed2DIds = [],
  layers = {
    walls: 'WALLS',
    columns: 'COLUMNS',
    doors: 'DOORS',
    parts: 'PARTS',
    text: 'TEXT',
  },
} = {}) {
  const d = new Drawing();
  const detailIds = normalizeDetailed2DIds(detailed2DIds);
  const doorLayer = layers.doors || 'DOORS';

  // Capas
  d.addLayer(layers.walls, Drawing.ACI.BLUE, 'CONTINUOUS');
  d.addLayer(layers.columns, Drawing.ACI.MAGENTA, 'CONTINUOUS');
  d.addLayer(doorLayer, Drawing.ACI.CYAN, 'CONTINUOUS');
  d.addLayer(layers.parts, Drawing.ACI.GREEN, 'CONTINUOUS');
  d.addLayer(layers.text, Drawing.ACI.WHITE, 'CONTINUOUS');

  // Helpers
  const addPolyline = (pts, layer, closed = false) => {
    if (!pts || pts.length < 2) return;
    d.setActiveLayer(layer);
    // dxf-writer trabaja en XY, nosotros mapeamos: X = x, Y = z
    const xy = pts.map((p) => [p.x, p.z]);
    d.drawPolyline(xy, closed);
  };

  const addText = (text, x, z, height = 0.12, layer = layers.text) => {
    d.setActiveLayer(layer);
    // drawText(text, x, y, height, rotation)
    d.drawText(String(text), x, z, height, 0);
  };

  // 1) Muros
  for (const w of walls || []) {
    const geometry = buildWallGeometry2D(w);
    geometry.segmentsGeometry.forEach((segment) => {
      const segmentOpenings = openings.filter((opening) => opening.wallId === w.id && opening.segmentId === segment.segmentId && opening.visible !== false && buildDoorGeometry2D(opening, walls, openings)?.valid);
      const pieces = segmentOpenings.length ? splitWallSegmentIntervals(segment, segmentOpenings) : [{ a: segment.start, b: segment.end }];
      pieces.forEach((piece) => addPolyline([piece.a, piece.b], layers.walls));
    });
  }

  for (const opening of openings || []) {
    if (opening?.visible === false) continue;
    const geometry = buildDoorGeometry2D(opening, walls, openings);
    if (!geometry?.valid) continue;
    d.setActiveLayer(doorLayer);
    d.drawLine(geometry.hinge.x, geometry.hinge.z, geometry.openEnd.x, geometry.openEnd.z);
    d.drawArc(geometry.arc.center.x, geometry.arc.center.z, geometry.arc.radius, geometry.arc.startAngle * 180 / Math.PI, geometry.arc.endAngle * 180 / Math.PI);
  }

  for (const column of columns || []) {
    if (column?.visible === false) continue;
    const geometry = buildColumnGeometry2D(column);
    d.setActiveLayer(layers.columns);
    if (geometry.shape === COLUMN_SHAPES.CIRCLE) {
      d.drawCircle(geometry.center.x, geometry.center.z, geometry.radius);
    } else {
      addPolyline(geometry.polygon, layers.columns, true);
    }
  }

  // 2) Piezas
  for (const p of partsSnapshot || []) {
    const geometry = buildFootprintWorldGeometry(p);
    if (!geometry) continue;
    const detailedShapes = is2DDetailEnabled(p, detailIds)
      ? buildDetailedFootprintWorldShapes(p)
      : [];
    d.setActiveLayer(layers.parts);
    if (detailedShapes.length) {
      detailedShapes.forEach((shape) => addPolyline(shape.points, layers.parts, shape.closed));
    } else if (
      (geometry.type === FOOTPRINT2D_TYPES.CIRCLE ||
        geometry.type === FOOTPRINT2D_TYPES.ELLIPSE) &&
      !geometry.fallback
    ) {
      const radiusX = geometry.radii.x;
      const radiusZ = geometry.radii.z;
      if (Math.abs(radiusX - radiusZ) <= 1e-9) {
        d.drawCircle(geometry.center.x, geometry.center.z, radiusX);
      } else {
        const rotation = Number.isFinite(Number(p.rotY)) ? Number(p.rotY) : 0;
        const xIsMajor = radiusX >= radiusZ;
        const majorRadius = xIsMajor ? radiusX : radiusZ;
        const minorRadius = xIsMajor ? radiusZ : radiusX;
        const axisAngle = rotation + (xIsMajor ? 0 : Math.PI / 2);
        d.drawEllipse(
          geometry.center.x,
          geometry.center.z,
          Math.cos(axisAngle) * majorRadius,
          Math.sin(axisAngle) * majorRadius,
          minorRadius / majorRadius
        );
      }
    } else {
      addPolyline(geometry.vertices, layers.parts, true);
    }

    // texto (código)
    if (p.codigoPT) {
      addText(p.codigoPT, geometry.center.x, geometry.center.z, 0.12, layers.text);
    }
  }

  return d.toDxfString();
}

export function exportPlanToDXF(options = {}) {
  const filename = options.filename || 'planta.dxf';
  const blob = new Blob([generatePlanDxf(options)], { type: 'application/dxf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
