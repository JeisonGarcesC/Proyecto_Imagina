import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createShapeFromTool,
  deleteShape2D,
  selectShapeAtPoint,
  translateShape2D,
  updateShape2D,
} from '../src/plan2d/geometry2D/shapeEditor2D.js';

test('crea todas las herramientas con semántica y geometría en mundo', () => {
  const tools = ['wall', 'door', 'window', 'rectangle', 'square', 'circle', 'triangle', 'line', 'polygon'];
  const shapes = tools.map((tool, index) => createShapeFromTool(tool, { x: index, y: 2 }, { id: tool }));
  assert.deepEqual(shapes.map((shape) => shape.id), tools);
  assert.deepEqual(shapes.slice(0, 3).map((shape) => shape.semanticType), ['wall', 'door', 'window']);
  assert.ok(shapes.slice(3).every((shape) => shape.semanticType === 'shape'));
});

test('actualiza geometría y estilo de forma inmutable', () => {
  const original = createShapeFromTool('rectangle', { x: 0, y: 0 }, { id: 'a' });
  const updated = updateShape2D([original], 'a', {
    geometry: { x: 3, width: 2 },
    style: { fill: true, stroke: '#ff0000', fillColor: '#00ff00' },
  });
  assert.equal(original.geometry.x, 0);
  assert.equal(updated[0].geometry.x, 3);
  assert.equal(updated[0].geometry.width, 2);
  assert.equal(updated[0].style.fill, true);
  assert.equal(updated[0].style.stroke, '#ff0000');
  assert.equal(updated[0].style.fillColor, '#00ff00');
});

test('selecciona individualmente y elimina sin afectar otros objetos', () => {
  const first = createShapeFromTool('circle', { x: 0, y: 0 }, { id: 'a' });
  const second = createShapeFromTool('square', { x: 3, y: 3 }, { id: 'b' });
  assert.equal(selectShapeAtPoint([first, second], { x: 0.1, y: 0.1 }).id, 'a');
  assert.deepEqual(deleteShape2D([first, second], 'a').map((shape) => shape.id), ['b']);
});

test('fill false permanece como valor inicial configurable', () => {
  const shape = createShapeFromTool('triangle', { x: 1, y: 1 }, { id: 'triangle' });
  assert.equal(shape.style.fill, false);
  assert.equal(shape.style.stroke, '#2563eb');
  assert.equal(shape.style.fillColor, '#93c5fd');
});

test('mueve figuras centradas, líneas y polígonos en coordenadas mundo', () => {
  const centered = createShapeFromTool('rectangle', { x: 0, y: 0 }, { id: 'centered' });
  const line = createShapeFromTool('line', { x: 0, y: 0 }, { id: 'line' });
  const polygon = createShapeFromTool('polygon', { x: 0, y: 0 }, { id: 'polygon' });
  const moved = ['centered', 'line', 'polygon'].reduce(
    (current, id) => translateShape2D(current, id, { x: 2, y: 3 }),
    [centered, line, polygon]
  );
  assert.deepEqual({ x: moved[0].geometry.x, y: moved[0].geometry.y }, { x: 2, y: 3 });
  assert.equal(moved[1].geometry.x1, line.geometry.x1 + 2);
  assert.equal(moved[1].geometry.y1, line.geometry.y1 + 3);
  assert.equal(moved[2].geometry.points[0].x, polygon.geometry.points[0].x + 2);
  assert.equal(moved[2].geometry.points[0].y, polygon.geometry.points[0].y + 3);
});
