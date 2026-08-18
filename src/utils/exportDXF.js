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

/**
 * Exporta planta 2D a DXF:
 * - walls[]: [{id, points:[{x,z}], thickness}]
 * - partsSnapshot[]: [{id, codigoPT, x, z, w, d, rotY}]
 */
export function generatePlanDxf({
  walls = [],
  partsSnapshot = [],
  detailed2DIds = [],
  layers = {
    walls: 'WALLS',
    parts: 'PARTS',
    text: 'TEXT',
  },
} = {}) {
  const d = new Drawing();
  const detailIds = normalizeDetailed2DIds(detailed2DIds);

  // Capas
  d.addLayer(layers.walls, Drawing.ACI.BLUE, 'CONTINUOUS');
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
    const pts = w?.points || [];
    if (pts.length < 2) continue;
    addPolyline(pts, layers.walls);
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
