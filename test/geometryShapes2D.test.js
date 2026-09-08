import test from 'node:test';
import assert from 'node:assert/strict';
import { transformShapeToCanvas } from '../src/plan2d/geometry2D/geometryUtils2D.js';
import { drawShape2D, drawShapes2D } from '../src/plan2d/geometry2D/shapesRenderer2D.js';
import { createShape, SHAPE_2D_TYPES } from '../src/plan2d/geometry2D/shapes2D.js';

const style = { stroke: '#ff0000', strokeWidth: 2, fill: false };
const shape = (type, geometry, extra = {}) => createShape({ type, geometry, style, ...extra });

function mockContext() {
  const calls = [];
  const ctx = { globalAlpha: 1, calls };
  for (const method of [
    'save', 'restore', 'beginPath', 'translate', 'rotate', 'rect', 'arc',
    'moveTo', 'lineTo', 'closePath', 'fill', 'stroke',
  ]) ctx[method] = (...args) => calls.push([method, ...args]);
  return ctx;
}

test('crea rectángulo, cuadrado, círculo, triángulo, línea y polígono', () => {
  const figures = [
    shape('rectangle', { x: 1, y: 2, width: 3, height: 4, rotation: 0.5 }),
    shape('square', { x: 1, y: 2, size: 3, rotation: 0 }),
    shape('circle', { x: 1, y: 2, radius: 3 }),
    shape('triangle', { x: 1, y: 2, width: 3, height: 4, rotation: 0 }),
    shape('line', { x1: 0, y1: 1, x2: 2, y2: 3 }),
    shape('polygon', { points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }] }),
  ];
  assert.deepEqual(figures.map((figure) => figure.type), Object.values(SHAPE_2D_TYPES));
});

test('mantiene geometría, estilo, semántica y visibilidad separados', () => {
  const figure = createShape({
    id: 'shape-1', type: 'rectangle', semanticType: 'window',
    geometry: { x: 0, y: 0, width: 1, height: 2 },
    style: { stroke: '#123456', strokeWidth: 3, fill: true, fillColor: '#abcdef', fillOpacity: 0.4 },
    visible: false,
  });
  assert.equal(figure.geometry.width, 1);
  assert.deepEqual(figure.style, {
    stroke: '#123456', strokeWidth: 3, fill: true, fillColor: '#abcdef', fillOpacity: 0.4,
  });
  assert.equal(figure.visible, false);
  assert.equal(figure.semanticType, 'window');
});

test('transforma mundo a Canvas conservando escala y rotación', () => {
  const figure = shape('rectangle', { x: 2, y: 3, width: 0.5, height: 0.25, rotation: 0.4 });
  const transformed = transformShapeToCanvas(figure, {
    toCanvas: (x, y) => [x * 10 + 5, y * 10 + 7], scale: 100,
  });
  assert.deepEqual(transformed, { x: 25, y: 37, width: 50, height: 25, rotation: -0.4 });
});

test('renderer respeta relleno ON/OFF', () => {
  const ctx = mockContext();
  const filled = createShape({
    type: 'circle', geometry: { x: 0, y: 0, radius: 1 },
    style: { fill: true, fillColor: '#00ff00', fillOpacity: 0.5 },
  });
  assert.equal(drawShape2D(ctx, filled, { toCanvas: () => [10, 20], scale: 5 }), true);
  assert.ok(ctx.calls.some(([method]) => method === 'arc'));
  assert.ok(ctx.calls.some(([method]) => method === 'fill'));
  assert.ok(ctx.calls.some(([method]) => method === 'stroke'));

  const noFillContext = mockContext();
  drawShape2D(noFillContext, shape('rectangle', { x: 0, y: 0, width: 1, height: 1 }), {
    toCanvas: () => [0, 0], scale: 1,
  });
  assert.equal(noFillContext.calls.some(([method]) => method === 'fill'), false);
});

test('renderer ignora figuras invisibles y procesa colecciones', () => {
  const ctx = mockContext();
  const visible = shape('line', { x1: 0, y1: 0, x2: 1, y2: 1 });
  const hidden = shape('circle', { x: 0, y: 0, radius: 1 }, { visible: false });
  assert.equal(drawShapes2D(ctx, [visible, hidden], { toCanvas: (x, y) => [x, y] }), 1);
});

test('rechaza tipos, dimensiones y polígonos inválidos', () => {
  assert.throws(() => shape('unknown', { x: 0, y: 0 }), TypeError);
  assert.throws(() => shape('rectangle', { x: 0, y: 0, width: 0, height: 1 }), RangeError);
  assert.throws(() => shape('circle', { x: 0, y: 0, radius: Number.NaN }), TypeError);
  assert.throws(() => shape('polygon', { points: [{ x: 0, y: 0 }] }), RangeError);
});
