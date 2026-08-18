import test from 'node:test';
import assert from 'node:assert/strict';
import {
  drawFurnitureFootprint2D,
  FURNITURE_2D_RENDER_MODES,
} from '../src/plan2d/furnitureRenderer2D.js';
import { createFootprint2D, FOOTPRINT2D_TYPES } from '../src/plan2d/footprint2D.js';

function createContext() {
  const calls = [];
  const ctx = { calls };
  ['beginPath', 'closePath', 'save', 'restore'].forEach((method) => {
    ctx[method] = (...args) => calls.push([method, ...args]);
  });
  ['rect', 'moveTo', 'lineTo', 'arc', 'ellipse', 'scale'].forEach((method) => {
    ctx[method] = (...args) => calls.push([method, ...args]);
  });
  return ctx;
}

function callsOf(ctx, method) {
  return ctx.calls.filter(([name]) => name === method);
}

test('dibuja POLYGON centrado y escalado al tamaño de la pieza', () => {
  const ctx = createContext();
  const footprint = createFootprint2D({
    type: FOOTPRINT2D_TYPES.POLYGON,
    points: [
      { x: 10, z: 20 },
      { x: 12, z: 20 },
      { x: 11, z: 21 },
    ],
  });
  const result = drawFurnitureFootprint2D(ctx, { w: 4, d: 2, footprint }, { scale: 10 });
  assert.equal(result.renderedType, FOOTPRINT2D_TYPES.POLYGON);
  assert.equal(callsOf(ctx, 'moveTo').length, 1);
  assert.equal(callsOf(ctx, 'lineTo').length, 2);
  assert.equal(callsOf(ctx, 'closePath').length, 1);
  assert.equal(callsOf(ctx, 'rect').length, 0);
});

test('dibuja RECTANGLE usando w/d actuales', () => {
  const ctx = createContext();
  const footprint = createFootprint2D({
    type: FOOTPRINT2D_TYPES.RECTANGLE,
    points: [
      { x: -1, z: -1 },
      { x: 1, z: -1 },
      { x: 1, z: 1 },
      { x: -1, z: 1 },
    ],
  });
  drawFurnitureFootprint2D(ctx, { w: 3, d: 2, footprint }, { scale: 10 });
  assert.deepEqual(callsOf(ctx, 'rect')[0], ['rect', -15, -10, 30, 20]);
});

test('dibuja CIRCLE mediante arc', () => {
  const ctx = createContext();
  const footprint = createFootprint2D({
    type: FOOTPRINT2D_TYPES.CIRCLE,
    points: [
      { x: -1, z: -1 },
      { x: 1, z: 1 },
      { x: 1, z: -1 },
    ],
    bounds: { w: 2, d: 2 },
    radiusX: 1,
    radiusZ: 1,
  });
  const result = drawFurnitureFootprint2D(ctx, { w: 2, d: 2, footprint }, { scale: 10 });
  assert.equal(result.renderedType, FOOTPRINT2D_TYPES.CIRCLE);
  assert.equal(callsOf(ctx, 'arc').length, 1);
});

test('dibuja ELLIPSE mediante ellipse', () => {
  const ctx = createContext();
  const footprint = createFootprint2D({
    type: FOOTPRINT2D_TYPES.ELLIPSE,
    points: [
      { x: -2, z: -1 },
      { x: 2, z: 1 },
      { x: 2, z: -1 },
    ],
    bounds: { w: 4, d: 2 },
    radiusX: 2,
    radiusZ: 1,
  });
  const result = drawFurnitureFootprint2D(ctx, { w: 4, d: 2, footprint }, { scale: 10 });
  assert.equal(result.renderedType, FOOTPRINT2D_TYPES.ELLIPSE);
  assert.equal(callsOf(ctx, 'ellipse').length, 1);
});

test('usa rectángulo ante footprint inválido', () => {
  const ctx = createContext();
  const result = drawFurnitureFootprint2D(
    ctx,
    {
      w: 4,
      d: 3,
      footprint: {
        version: 1,
        type: FOOTPRINT2D_TYPES.POLYGON,
        points: [{ x: Number.NaN, z: 0 }],
        center: { x: 0, z: 0 },
        bounds: { w: 4, d: 3 },
      },
    },
    { scale: 5 }
  );
  assert.equal(result.fallback, true);
  assert.deepEqual(callsOf(ctx, 'rect')[0], ['rect', -10, -7.5, 20, 15]);
});

test('modo DETAILED dibuja contornos independientes', () => {
  const ctx = createContext();
  const footprint = createFootprint2D({
    type: FOOTPRINT2D_TYPES.RECTANGLE,
    points: [
      { x: -1, z: -1 },
      { x: 1, z: -1 },
      { x: 1, z: 1 },
      { x: -1, z: 1 },
    ],
  });
  const detailedShapes = [
    { points: [{ x: -1, z: -1 }, { x: 0, z: -1 }, { x: 0, z: 1 }] },
    { points: [{ x: 0, z: -1 }, { x: 1, z: -1 }, { x: 1, z: 1 }] },
  ];
  const result = drawFurnitureFootprint2D(
    ctx,
    { w: 2, d: 2, footprint, detailedFootprint: { detailedShapes } },
    { scale: 10, mode: FURNITURE_2D_RENDER_MODES.DETAILED }
  );
  assert.equal(result.renderedType, FURNITURE_2D_RENDER_MODES.DETAILED);
  assert.equal(result.shapeCount, 2);
  assert.equal(callsOf(ctx, 'moveTo').length, 2);
});

test('modo DETAILED sin datos conserva el render NORMAL', () => {
  const ctx = createContext();
  const footprint = createFootprint2D({
    type: FOOTPRINT2D_TYPES.RECTANGLE,
    points: [
      { x: -1, z: -1 },
      { x: 1, z: -1 },
      { x: 1, z: 1 },
      { x: -1, z: 1 },
    ],
  });
  const result = drawFurnitureFootprint2D(
    ctx,
    { w: 2, d: 2, footprint },
    { scale: 10, mode: FURNITURE_2D_RENDER_MODES.DETAILED }
  );
  assert.equal(result.renderedType, FOOTPRINT2D_TYPES.RECTANGLE);
  assert.equal(callsOf(ctx, 'rect').length, 1);
});
