import test from 'node:test';
import assert from 'node:assert/strict';
import { boundsFromData, generatePlanSvg } from '../src/utils/planExport.js';
import { worldToCanvas2D } from '../src/plan2d/worldToCanvas2D.js';
import { transformShapeToCanvas } from '../src/plan2d/geometry2D/geometryUtils2D.js';
import { createShapeFromTool } from '../src/plan2d/geometry2D/shapeEditor2D.js';
import { createAreaMeasurement, areaLabelPoint } from '../src/plan2d/areaMeasurement.js';

test('áreas y marcados conservan posición y rotación del Canvas en SVG con zonas separadas', () => {
  const parts = [
    { id: 'P1', x: -4, z: -3, w: 1, d: 0.6, rotY: 0 },
    { id: 'P2', x: 2, z: 5, w: 1.2, d: 0.7, rotY: 0 },
  ];
  const shapes2D = [
    createShapeFromTool('areaRectangle', { x: -3, y: -2 }, { id: 'R1' }),
    createShapeFromTool('areaRectangle', { x: 3, y: 4 }, { id: 'R2' }),
    createShapeFromTool('circle', { x: -2, y: 3 }, { id: 'CIRCLE' }),
    createShapeFromTool('polygon', { x: 4, y: 5 }, { id: 'HEXAGON' }),
  ];
  shapes2D[1] = { ...shapes2D[1], geometry: { ...shapes2D[1].geometry, rotation: Math.PI / 6 } };
  const area = createAreaMeasurement([
    { x: -4, z: 2 }, { x: -1, z: 2 }, { x: 0, z: 4 }, { x: -3, z: 5 },
  ], 'AREA');
  const dimensions = [{ id: 'DIM', type: 'ALIGNED', startPoint: { x: 1, z: 5 }, endPoint: { x: 2.2, z: 5 }, value: 1.2, unit: 'm', label: '1.200 m', offset: 20 }];
  const pxPerM = 140;
  const bounds = boundsFromData(parts, [], [], [], dimensions, [area], shapes2D, [], pxPerM, false);
  const minX = bounds.minX - 0.25;
  const maxX = bounds.maxX + 0.25;
  const minZ = bounds.minZ - 0.25;
  const maxZ = bounds.maxZ + 0.25;
  const width = Math.ceil((maxX - minX) * pxPerM);
  const height = Math.ceil((maxZ - minZ) * pxPerM);
  const toCanvas = (x, z) => worldToCanvas2D(x, z, {
    centerX: (minX + maxX) / 2, centerZ: (minZ + maxZ) / 2,
    scale: pxPerM, width, height, invertZ: false,
  });
  const svg = generatePlanSvg({ parts, shapes2D, areaMeasurements: [area], dimensions, invertZ: false, pxPerM });
  const rectangles = shapes2D.slice(0, 2).map((shape) => transformShapeToCanvas(shape, { toCanvas, scale: pxPerM }));
  for (const rect of rectangles) {
    assert.ok(svg.includes(`translate(${rect.x} ${rect.y}) rotate(${rect.rotation * 180 / Math.PI})`));
  }
  const circle = transformShapeToCanvas(shapes2D[2], { toCanvas, scale: pxPerM });
  assert.ok(svg.includes(`<circle cx="${circle.x}" cy="${circle.y}" r="${circle.radius}"`));
  const hexagon = transformShapeToCanvas(shapes2D[3], { toCanvas, scale: pxPerM });
  assert.ok(svg.includes(`points="${hexagon.points.map((point) => point.join(',')).join(' ')}"`));
  const areaPoints = area.points.map((point) => toCanvas(point.x, point.z).join(','));
  assert.ok(svg.includes(`points="${areaPoints.join(' ')}"`));
  const areaLabel = areaLabelPoint(area.points);
  const [labelX, labelY] = toCanvas(areaLabel.x, areaLabel.z);
  assert.ok(svg.includes(`<text x="${labelX}" y="${labelY}"`));
  assert.ok(rectangles[1].y > rectangles[0].y);
  assert.ok(Math.min(...hexagon.points.map((point) => point[1])) > rectangles[0].y);
  assert.ok(svg.includes('1.200 m'));
});

test('proyección compartida mantiene la orientación del editor y respeta la inversión opcional', () => {
  const frame = { centerX: 0, centerZ: 0, scale: 100, width: 800, height: 600 };
  assert.deepEqual(worldToCanvas2D(2, 3, { ...frame, invertZ: false }), [600, 600]);
  assert.deepEqual(worldToCanvas2D(2, 3, { ...frame, invertZ: true }), [600, 0]);
});
