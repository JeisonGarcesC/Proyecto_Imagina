import test from 'node:test';
import assert from 'node:assert/strict';

import { createFootprint2D, FOOTPRINT2D_TYPES } from '../src/plan2d/footprint2D.js';
import { get2DDetailKey } from '../src/plan2d/detailSelection2D.js';
import { generatePlanSvg } from '../src/utils/planExport.js';
import { generatePlanDxf } from '../src/utils/exportDXF.js';

const normalFootprint = createFootprint2D({
  type: FOOTPRINT2D_TYPES.RECTANGLE,
  center: { x: 0, z: 0 },
  bounds: { w: 2, d: 1 },
  points: [
    { x: -1, z: -0.5 }, { x: 1, z: -0.5 },
    { x: 1, z: 0.5 }, { x: -1, z: 0.5 },
  ],
});

const detailedFootprint = {
  detailedShapes: [
    {
      role: 'TOP', closed: true,
      points: [
        { x: -1, z: -0.5 }, { x: 1, z: -0.5 },
        { x: 1, z: 0 }, { x: -1, z: 0 },
      ],
    },
    {
      role: 'BASE', closed: true,
      points: [
        { x: -0.8, z: 0.1 }, { x: 0.8, z: 0.1 },
        { x: 0.8, z: 0.5 }, { x: -0.8, z: 0.5 },
      ],
    },
  ],
};

function part(id, changes = {}) {
  return {
    id,
    instanceId: id,
    x: 0,
    z: 0,
    w: 2,
    d: 1,
    rotY: 0,
    footprint: normalFootprint,
    detailedFootprint,
    ...changes,
  };
}

const countSvgPolygons = (svg) => (svg.match(/<polygon /g) || []).length;
const countDxfPolylines = (dxf) => (dxf.match(/\nLWPOLYLINE\n/g) || []).length;

test('dos objetos: solo el marcado exporta múltiples shapes', () => {
  const parts = [part('A'), part('B', { x: 4 })];
  const detailed2DIds = [get2DDetailKey(parts[0])];
  assert.equal(countSvgPolygons(generatePlanSvg({ parts, detailed2DIds })), 2);
  assert.equal(countDxfPolylines(generatePlanDxf({ partsSnapshot: parts, detailed2DIds })), 3);
});

test('sin detailed2DIds conserva la exportación normal de Fase 6', () => {
  const parts = [part('A')];
  assert.equal(countSvgPolygons(generatePlanSvg({ parts })), 0);
  assert.equal(countDxfPolylines(generatePlanDxf({ partsSnapshot: parts })), 1);
});

test('detalle solicitado sin caché usa footprint normal', () => {
  const target = part('A', { detailedFootprint: null });
  const detailed2DIds = [get2DDetailKey(target)];
  assert.equal(countSvgPolygons(generatePlanSvg({ parts: [target], detailed2DIds })), 0);
  assert.equal(countDxfPolylines(generatePlanDxf({ partsSnapshot: [target], detailed2DIds })), 1);
});

test('assembly Koncisa detalla todos sus componentes físicos', () => {
  const parts = [
    part('SURFACE', { parentAssemblyId: 'KONCISA_1' }),
    part('COSTADO', { parentAssemblyId: 'KONCISA_1', x: 3 }),
  ];
  const detailed2DIds = [get2DDetailKey(parts[0])];
  assert.equal(countSvgPolygons(generatePlanSvg({ parts, detailed2DIds })), 4);
  assert.equal(countDxfPolylines(generatePlanDxf({ partsSnapshot: parts, detailed2DIds })), 4);
});

test('dos assemblies: solo uno se detalla', () => {
  const first = part('A', { parentAssemblyId: 'KONCISA_A' });
  const second = part('B', { parentAssemblyId: 'KONCISA_B', x: 4 });
  const detailed2DIds = [get2DDetailKey(first)];
  assert.equal(countSvgPolygons(generatePlanSvg({ parts: [first, second], detailed2DIds })), 2);
  assert.equal(countDxfPolylines(generatePlanDxf({ partsSnapshot: [first, second], detailed2DIds })), 3);
});

test('detalle movido y rotado usa transformación mundial', () => {
  const target = part('A', { x: 5, z: -3, rotY: Math.PI / 2 });
  const detailed2DIds = [get2DDetailKey(target)];
  const dxf = generatePlanDxf({ partsSnapshot: [target], detailed2DIds });
  assert.match(dxf, /\n10\n5\.5\n/);
  assert.match(dxf, /\n20\n-4\n/);
});

test('200 objetos consumen detalle únicamente para el marcado', () => {
  const parts = Array.from({ length: 200 }, (_, index) => part(`P${index}`, { x: index * 3 }));
  const detailed2DIds = [get2DDetailKey(parts[137])];
  const dxf = generatePlanDxf({ partsSnapshot: parts, detailed2DIds });
  assert.equal(countDxfPolylines(dxf), 201);
});
