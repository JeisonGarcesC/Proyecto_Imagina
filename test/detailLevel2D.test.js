import test from 'node:test';
import assert from 'node:assert/strict';
import { createRectangleFootprint } from '../src/plan2d/footprint2D.js';
import { getVisibleDetailed2DShapes, shouldRenderDetailed2DShape } from '../src/plan2d/detailLevel2D.js';
import { buildDetailedFootprintWorldShapes, hitTestFootprint2D } from '../src/plan2d/footprintGeometry2D.js';
import { generatePlanSvg } from '../src/utils/planExport.js';
import { generatePlanDxf } from '../src/utils/exportDXF.js';
import DxfParser from 'dxf-parser';
import { get2DDetailKey } from '../src/plan2d/detailSelection2D.js';
import { drawFurnitureFootprint2D, FURNITURE_2D_RENDER_MODES } from '../src/plan2d/furnitureRenderer2D.js';
import { createDimension2D } from '../src/plan2d/dimension2D.js';
import { getResolvedDimension2D } from '../src/plan2d/dimensionReferenceResolver.js';
import { buildSnapGeometry } from '../src/plan2d/geometrySnap2D.js';
import { createShape } from '../src/plan2d/geometry2D/shapes2D.js';
import { buildElevationSnapGeometry } from '../src/plan2d/geometry2D/elevation2D.js';

const polygon = (role, sourceMesh, x = 0) => ({
  role, sourceMesh, closed: true,
  points: [{ x, z: 0 }, { x: x + 0.1, z: 0 }, { x: x + 0.1, z: 0.1 }],
});

const shapes = [
  polygon('DIVIDER_1', 'DIVIDER_1'),
  polygon('SHELF_PANEL', 'SHELF_PANEL', 0.2),
  polygon('UNKNOWN_GLB_MESH', 'UNKNOWN_GLB_MESH', 0.4),
  polygon('TOP', 'TOP', 0.5),
  polygon('HANDLE_BAR', 'HANDLE_BAR', 0.6),
  polygon('HINGE', 'HINGE', 0.7),
  polygon('FRONT_RETURN_1', 'FRONT_RETURN_1', 0.8),
];
const part = {
  id: 'locker-1', kind: 'LOCKER_PRODUCT', x: 0, z: 0, w: 1, d: 1, rotY: 0,
  footprint: createRectangleFootprint({ localCenter: [0, 0, 0], sizeLocal: [1, 1, 1] }),
  detailedFootprint: { detailedShapes: shapes },
};

test('nivel 1 usa la huella y no expone formas detalladas', () => {
  assert.deepEqual(getVisibleDetailed2DShapes(part, 1), []);
  assert.equal(buildDetailedFootprintWorldShapes(part, 1).length, 0);
  assert.equal(hitTestFootprint2D(part, { x: 0, z: 0 }), true);
});

test('nivel 2 es menor que el detalle actual y conserva formas desconocidas', () => {
  assert.deepEqual(getVisibleDetailed2DShapes(part, 2), [shapes[0], shapes[2]]);
  assert.deepEqual(getVisibleDetailed2DShapes(part, 3), shapes);
  assert.ok(getVisibleDetailed2DShapes(part, 2).length < shapes.length / 2);
  assert.equal(shouldRenderDetailed2DShape({ detailLevel: 2, family: 'LOCKERS', sourceMesh: 'DOOR_PANEL' }), true);
  assert.equal(shouldRenderDetailed2DShape({ detailLevel: 2, family: 'LOCKERS', sourceMesh: 'HINGE' }), false);
  assert.equal(shouldRenderDetailed2DShape({ detailLevel: 2, family: 'OTHER', role: 'SHELF_PANEL' }), true);
});

test('niveles 3 y 4 devuelven la colección DETAILED original sin reordenarla', () => {
  for (const level of [3, 4]) {
    assert.strictEqual(getVisibleDetailed2DShapes(part, level), shapes);
    assert.deepEqual(buildDetailedFootprintWorldShapes(part, level).map((shape) => shape.role), shapes.map((shape) => shape.role));
  }
});

test('KUO reserva componentes secundarios para niveles 3 y 4', () => {
  const kuo = { ...part, kind: 'KUO_AV_DOBLE_ASSEMBLY', detailedFootprint: {
    detailedShapes: [polygon('SURFACE_FRONT', 'surface'), polygon('DOUBLE_DUCT', 'duct'), polygon('MESH', 'unknown')],
  } };
  assert.deepEqual(getVisibleDetailed2DShapes(kuo, 2).map((shape) => shape.role), ['SURFACE_FRONT', 'MESH']);
  assert.equal(getVisibleDetailed2DShapes(kuo, 3).length, 3);
});

test('SVG y DXF aplican la misma selección de formas por nivel', () => {
  for (const level of [1, 2, 3, 4]) {
    const expected = getVisibleDetailed2DShapes(part, level).length;
    const svg = generatePlanSvg({ parts: [part], detailLevel: level, detailAll: true });
    const dxf = generatePlanDxf({ partsSnapshot: [part], detailLevel: level, detailAll: true });
    assert.equal((svg.match(/<polygon points=/g) || []).length, expected);
    assert.equal((dxf.match(/LWPOLYLINE/g) || []).length >= expected, true);
  }
});

test('nivel 3 conserva exactamente la salida de exportación detallada anterior', () => {
  const detailed2DIds = [get2DDetailKey(part)];
  assert.equal(
    generatePlanSvg({ parts: [part], detailed2DIds }),
    generatePlanSvg({ parts: [part], detailLevel: 3, detailAll: true })
  );
  const entities = (options) => new DxfParser().parseSync(generatePlanDxf(options))
    .entities.map(({ type, layer, vertices }) => ({ type, layer, vertices }));
  assert.deepEqual(
    entities({ partsSnapshot: [part], detailed2DIds }),
    entities({ partsSnapshot: [part], detailLevel: 3, detailAll: true })
  );
});

test('nivel 4 añade la huella normal y conserva todos los contornos de nivel 3', () => {
  const svg3 = generatePlanSvg({ parts: [part], detailLevel: 3, detailAll: true });
  const svg4 = generatePlanSvg({ parts: [part], detailLevel: 4, detailAll: true });
  const detailedPolygons = svg3.match(/<polygon points="[^"]+"[^>]+>/g) || [];
  detailedPolygons.forEach((polygonMarkup) => assert.ok(svg4.includes(polygonMarkup)));
  assert.match(svg4, /<rect[^>]+fill="none"/);
  const vertices = (level) => new DxfParser().parseSync(generatePlanDxf({
    partsSnapshot: [part], detailLevel: level, detailAll: true,
  })).entities.map((entity) => entity.vertices);
  assert.deepEqual(vertices(4).slice(0, shapes.length), vertices(3));
  assert.equal(vertices(4).length, vertices(3).length + 1);
});

test('nivel 3 conserva el mismo trazado Canvas del modo DETAILED anterior', () => {
  const trace = (options) => {
    const calls = [];
    const ctx = Object.fromEntries(['beginPath', 'rect', 'moveTo', 'lineTo', 'closePath']
      .map((name) => [name, (...args) => calls.push([name, ...args])]));
    drawFurnitureFootprint2D(ctx, part, { scale: 100, mode: FURNITURE_2D_RENDER_MODES.DETAILED, ...options });
    return calls;
  };
  assert.deepEqual(trace(), trace({ detailLevel: 3 }));
});

test('cambiar niveles no modifica la huella usada por selección ni los metadatos de las formas', () => {
  const footprint = part.footprint;
  const before = JSON.stringify(shapes);
  for (const level of [1, 2, 3, 4]) {
    getVisibleDetailed2DShapes(part, level);
    assert.equal(hitTestFootprint2D(part, { x: 0, z: 0 }), true);
    assert.strictEqual(part.footprint, footprint);
  }
  assert.equal(JSON.stringify(shapes), before);
});

test('cotas y sus puntos de snap siguen independientes del nivel', () => {
  const dimension = createDimension2D({ id: 'dimension-1', startPoint: { x: 0, z: 0 }, endPoint: { x: 1, z: 0 } });
  const snap = buildSnapGeometry([part]);
  const baseline = getResolvedDimension2D({ dimension, snapGeometry: snap });
  for (const level of [1, 2, 3, 4]) {
    getVisibleDetailed2DShapes(part, level);
    assert.deepEqual(buildSnapGeometry([part]), snap);
    assert.deepEqual(getResolvedDimension2D({ dimension, snapGeometry: snap }), baseline);
  }
});

test('el alzado conserva su figura y geometría de snap al cambiar nivel', () => {
  const elevation = createShape({
    id: 'elevation-1', type: 'elevation', viewDirection: 'front',
    sourceBoxes: [{ min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }],
    geometry: { x: 2, y: 2 },
  });
  const baseline = buildElevationSnapGeometry([elevation]);
  for (const level of [1, 2, 3, 4]) {
    getVisibleDetailed2DShapes(part, level);
    assert.deepEqual(buildElevationSnapGeometry([elevation]), baseline);
  }
});
