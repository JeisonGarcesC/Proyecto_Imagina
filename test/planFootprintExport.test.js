import test from 'node:test';
import assert from 'node:assert/strict';

import { createFootprint2D, FOOTPRINT2D_TYPES } from '../src/plan2d/footprint2D.js';
import { generatePlanSvg } from '../src/utils/planExport.js';
import { generatePlanDxf } from '../src/utils/exportDXF.js';

const part = (changes = {}) => ({ id: 'P1', x: 0, z: 0, w: 2, d: 1, rotY: 0, ...changes });
const shape = (type, points = [], extra = {}) => createFootprint2D({ type, points, ...extra });
const triangle = shape(FOOTPRINT2D_TYPES.TRIANGLE, [
  { x: -1, z: -0.5 }, { x: 1, z: -0.5 }, { x: 0, z: 0.5 },
]);
const irregular = shape(FOOTPRINT2D_TYPES.POLYGON, [
  { x: -1, z: -0.5 }, { x: 1, z: -0.5 }, { x: 0.7, z: 0.2 },
  { x: 0, z: 0.5 }, { x: -0.8, z: 0.3 },
]);
const circle = shape(FOOTPRINT2D_TYPES.CIRCLE, [], {
  center: { x: 0, z: 0 }, bounds: { w: 2, d: 2 }, radiusX: 1, radiusZ: 1,
});
const ellipse = shape(FOOTPRINT2D_TYPES.ELLIPSE, [], {
  center: { x: 0, z: 0 }, bounds: { w: 2, d: 1 }, radiusX: 1, radiusZ: 0.5,
});

test('SVG conserva rectángulo y fallback legacy', () => {
  assert.match(generatePlanSvg({ parts: [part()] }), /<rect x="-140\.00"/);
  assert.match(generatePlanSvg({ parts: [part({ footprint: { type: 'UNKNOWN' } })] }), /<rect x="-140\.00"/);
});

test('SVG exporta triángulo y polígono irregular', () => {
  const svg = generatePlanSvg({ parts: [part({ footprint: triangle }), part({ id: 'P2', x: 3, footprint: irregular })] });
  assert.equal((svg.match(/<polygon /g) || []).length, 2);
});

test('SVG exporta círculo, elipse, movimiento y rotación', () => {
  assert.match(generatePlanSvg({ parts: [part({ w: 2, d: 2, footprint: circle })] }), /<circle /);
  assert.match(generatePlanSvg({ parts: [part({ x: 4, z: -2, footprint: ellipse, rotY: Math.PI / 4 })] }), /<ellipse [^>]*rotate\(-45\.00/);
});

test('DXF exporta rectángulo cerrado y triángulo de tres vértices', () => {
  const rectangleDxf = generatePlanDxf({ partsSnapshot: [part()] });
  const triangleDxf = generatePlanDxf({ partsSnapshot: [part({ footprint: triangle })] });
  assert.match(rectangleDxf, /LWPOLYLINE/);
  assert.match(rectangleDxf, /\n90\n4\n/);
  assert.match(rectangleDxf, /\n70\n1\n/);
  assert.match(triangleDxf, /\n90\n3\n/);
});

test('DXF exporta polígono irregular con movimiento y rotación', () => {
  const dxf = generatePlanDxf({ partsSnapshot: [part({ x: 5, z: -3, rotY: Math.PI / 2, footprint: irregular })] });
  assert.match(dxf, /\n90\n5\n/);
  assert.match(dxf, /\n10\n5\.5\n/);
});

test('DXF exporta CIRCLE y ELLIPSE', () => {
  assert.match(generatePlanDxf({ partsSnapshot: [part({ w: 2, d: 2, footprint: circle })] }), /\nCIRCLE\n/);
  assert.match(generatePlanDxf({ partsSnapshot: [part({ footprint: ellipse })] }), /\nELLIPSE\n/);
});

test('DXF usa fallback rectangular ante footprint inválido', () => {
  const dxf = generatePlanDxf({ partsSnapshot: [part({ footprint: { type: 'UNKNOWN' } })] });
  assert.match(dxf, /LWPOLYLINE/);
  assert.match(dxf, /\n90\n4\n/);
});
