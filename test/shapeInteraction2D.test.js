import test from 'node:test';
import assert from 'node:assert/strict';
import { createShapeFromTool, deleteShape2D } from '../src/plan2d/geometry2D/shapeEditor2D.js';
import {
  canvasToWorld2D,
  getShapeHandles2D,
  hitTestInteractiveShape2D,
  moveShape2D,
  resizeShape2D,
  rotateShape2D,
  selectInteractiveShapeAtPoint,
  worldToCanvas2D,
} from '../src/plan2d/geometry2D/shapeInteraction2D.js';

const make = (tool, point = { x: 0, y: 0 }) => createShapeFromTool(tool, point, { id: tool });

test('selecciona rectángulo, círculo, triángulo, línea y polígono por geometría real', () => {
  for (const tool of ['rectangle', 'circle', 'triangle', 'line', 'polygon']) {
    assert.equal(hitTestInteractiveShape2D(make(tool), { x: 0, y: 0 }, 0.05), true, tool);
  }
  assert.equal(hitTestInteractiveShape2D(make('line'), { x: 0, y: 0.2 }, 0.05), false);
  assert.equal(selectInteractiveShapeAtPoint([make('rectangle'), make('circle')], { x: 0, y: 0 }).id, 'circle');
});

test('mueve rectángulo, círculo, polígono y línea sin salir de coordenadas mundo', () => {
  for (const tool of ['rectangle', 'circle', 'polygon', 'line']) {
    const original = make(tool);
    const moved = moveShape2D(original, { x: 2, y: -3 });
    const originalHandle = getShapeHandles2D(original)[0];
    const movedHandle = getShapeHandles2D(moved)[0];
    assert.equal(movedHandle.x, originalHandle.x + 2, tool);
    assert.equal(movedHandle.y, originalHandle.y - 3, tool);
  }
});

test('redimensiona rectángulo, cuadrado, círculo y triángulo', () => {
  const rectangle = resizeShape2D(make('rectangle'), 'se', { x: 2, y: 1 });
  assert.ok(rectangle.geometry.width > 1);
  assert.ok(rectangle.geometry.height > 0.6);

  const square = resizeShape2D(make('square'), 'se', { x: 2, y: 1 });
  assert.ok(square.geometry.size > 0.75);

  const circle = resizeShape2D(make('circle'), 'radius', { x: 2, y: 0 });
  assert.equal(circle.geometry.radius, 2);

  const triangle = resizeShape2D(make('triangle'), 'ne', { x: 2, y: -1 });
  assert.ok(triangle.geometry.width > 0.8);
  assert.ok(triangle.geometry.height > 0.7);
});

test('redimensiona extremos de línea y únicamente el vértice elegido del polígono', () => {
  const line = make('line');
  const resizedLine = resizeShape2D(line, 'start', { x: -2, y: 3 });
  assert.deepEqual(
    { x1: resizedLine.geometry.x1, y1: resizedLine.geometry.y1, x2: resizedLine.geometry.x2, y2: resizedLine.geometry.y2 },
    { x1: -2, y1: 3, x2: line.geometry.x2, y2: line.geometry.y2 }
  );

  const polygon = make('polygon');
  const resizedPolygon = resizeShape2D(polygon, 'vertex:2', { x: 4, y: 5 });
  assert.deepEqual(resizedPolygon.geometry.points[2], { x: 4, y: 5 });
  assert.deepEqual(resizedPolygon.geometry.points[1], polygon.geometry.points[1]);
});

test('rota rectángulo, cuadrado, triángulo y polígono en radianes', () => {
  for (const tool of ['rectangle', 'square', 'triangle', 'polygon']) {
    const rotated = rotateShape2D(make(tool), Math.PI / 3);
    assert.equal(rotated.geometry.rotation, Math.PI / 3, tool);
  }
  assert.equal(rotateShape2D(make('circle'), 1).geometry.rotation, undefined);
});

test('las manijas solo existen para una figura seleccionable y respetan su tipo', () => {
  assert.equal(getShapeHandles2D(make('rectangle')).length, 5);
  assert.equal(getShapeHandles2D(make('circle')).length, 1);
  assert.equal(getShapeHandles2D(make('line')).length, 2);
  assert.equal(getShapeHandles2D({ ...make('rectangle'), semanticType: 'cimbra' }).length, 0);
});

test('Canvas y mundo son conversiones inversas con zoom, pan y rotación', () => {
  const point = { x: 4.2, y: -1.7 };
  for (const view of [
    { centerX: 0, centerY: 0, width: 800, height: 600, scale: 50, rotation: 0, invertY: true },
    { centerX: 2, centerY: -3, width: 1200, height: 500, scale: 100, rotation: Math.PI / 5, invertY: true },
    { centerX: -4, centerY: 8, width: 640, height: 480, scale: 220, rotation: -Math.PI / 2, invertY: false },
  ]) {
    const canvas = worldToCanvas2D(point, view);
    const restored = canvasToWorld2D(canvas, view);
    assert.ok(Math.abs(restored.x - point.x) < 1e-10);
    assert.ok(Math.abs(restored.y - point.y) < 1e-10);
  }
});

test('elimina únicamente la figura seleccionada y las cimbras no participan', () => {
  const shapes = [make('rectangle'), make('circle')];
  assert.deepEqual(deleteShape2D(shapes, 'rectangle').map((shape) => shape.id), ['circle']);
  const cimbra = { ...make('rectangle'), semanticType: 'cimbra' };
  assert.equal(hitTestInteractiveShape2D(cimbra, { x: 0, y: 0 }), false);
});
