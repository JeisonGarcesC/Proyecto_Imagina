import assert from 'node:assert/strict';
import test from 'node:test';

import { createText2D, TEXT_2D_DEFAULT_STYLE } from '../src/plan2d/text2D/text2D.js';
import {
  createTextAtPoint2D,
  deleteText2D,
  moveText2D,
  rotateText2D,
  updateText2D,
} from '../src/plan2d/text2D/textEditor2D.js';
import {
  getTextHandles2D,
  hitTestText2D,
  measureText2D,
  pickTextHandle2D,
  selectTextAtPoint2D,
} from '../src/plan2d/text2D/textInteraction2D.js';
import { drawText2D } from '../src/plan2d/text2D/textRenderer2D.js';

function createContext() {
  const calls = [];
  return {
    calls,
    font: '',
    fillStyle: '',
    textAlign: '',
    textBaseline: '',
    save() {},
    restore() {},
    translate(x, y) { calls.push(['translate', x, y]); },
    rotate(value) { calls.push(['rotate', value]); },
    setLineDash(value) { calls.push(['dash', value]); },
    strokeRect(...args) { calls.push(['strokeRect', ...args]); },
    fillText(...args) { calls.push(['fillText', ...args]); },
    measureText(value) { return { width: String(value).length * 10 }; },
  };
}

test('crea texto serializable con geometría en coordenadas de mundo', () => {
  const item = createTextAtPoint2D({ x: 2.5, y: -1.25 }, { id: 'text-1' });
  assert.deepEqual(item.geometry, { x: 2.5, y: -1.25, rotation: 0 });
  assert.equal(item.text, 'Texto');
  assert.deepEqual(item.style, TEXT_2D_DEFAULT_STYLE);
  assert.doesNotThrow(() => JSON.stringify(item));
});

test('actualiza contenido y estilo sin mutar el elemento original', () => {
  const original = createTextAtPoint2D({ x: 0, y: 0 }, { id: 'text-1' });
  const [updated] = updateText2D([original], original.id, {
    text: 'Línea 1\nLínea 2',
    style: { fontSize: 0.35, color: '#12abef', fontWeight: 'bold' },
  });
  assert.notEqual(updated, original);
  assert.equal(original.text, 'Texto');
  assert.equal(updated.text, 'Línea 1\nLínea 2');
  assert.equal(updated.style.color, '#12ABEF');
  assert.equal(updated.style.fontSize, 0.35);
  assert.equal(updated.style.fontWeight, 'bold');
});

test('mueve y rota texto conservando estilo y contenido', () => {
  const original = createText2D({
    id: 'text-1',
    geometry: { x: 1, y: 2, rotation: 0 },
    text: 'A',
    style: { color: '#ff0000' },
  });
  const moved = moveText2D(original, { x: 3, y: -1 });
  const rotated = rotateText2D(moved, Math.PI);
  assert.deepEqual(rotated.geometry, { x: 4, y: 1, rotation: Math.PI });
  assert.equal(rotated.text, 'A');
  assert.equal(rotated.style.color, '#FF0000');
  assert.deepEqual(original.geometry, { x: 1, y: 2, rotation: 0 });
});

test('elimina solamente el texto indicado', () => {
  const first = createTextAtPoint2D({ x: 0, y: 0 }, { id: 'first' });
  const second = createTextAtPoint2D({ x: 1, y: 1 }, { id: 'second' });
  assert.deepEqual(deleteText2D([first, second], 'first').map((item) => item.id), ['second']);
});

test('mide texto multilinea con measureText y unidades de mundo', () => {
  const ctx = createContext();
  const item = createText2D({
    id: 'text-1',
    geometry: { x: 0, y: 0 },
    text: 'AB\nABCDE',
    style: { fontSize: 0.2 },
  });
  const metrics = measureText2D(ctx, item, 100);
  assert.equal(metrics.width, 0.5);
  assert.equal(metrics.height, 0.48);
  assert.equal(metrics.lines.length, 2);
});

test('detecta texto sin rotación dentro de su caja medida', () => {
  const ctx = createContext();
  const item = createText2D({
    id: 'text-1',
    geometry: { x: 2, y: 3 },
    text: 'ABCD',
    style: { fontSize: 0.2 },
  });
  assert.equal(hitTestText2D(ctx, item, { x: 2.2, y: 3 }, 100, 0), true);
  assert.equal(hitTestText2D(ctx, item, { x: 3, y: 3 }, 100, 0), false);
});

test('hit testing respeta la rotación del texto', () => {
  const ctx = createContext();
  const item = createText2D({
    id: 'text-1',
    geometry: { x: 0, y: 0, rotation: Math.PI / 2 },
    text: 'ABCD',
    style: { fontSize: 0.2 },
  });
  assert.equal(hitTestText2D(ctx, item, { x: 0, y: 0.2 }, 100, 0), true);
  assert.equal(hitTestText2D(ctx, item, { x: 0.3, y: 0 }, 100, 0), false);
});

test('selecciona primero el texto visualmente superior', () => {
  const ctx = createContext();
  const first = createTextAtPoint2D({ x: 0, y: 0 }, { id: 'first' });
  const second = createTextAtPoint2D({ x: 0, y: 0 }, { id: 'second' });
  assert.equal(selectTextAtPoint2D(ctx, [first, second], { x: 0.1, y: 0 }, 100, 0).id, 'second');
});

test('expone únicamente el control de rotación y permite seleccionarlo', () => {
  const ctx = createContext();
  const item = createTextAtPoint2D({ x: 0, y: 0 }, { id: 'text-1' });
  const handles = getTextHandles2D(ctx, item, 100, 0.3);
  assert.deepEqual(handles.map((handle) => handle.kind), ['rotate']);
  assert.equal(pickTextHandle2D(ctx, item, handles[0], 0.01, 100, 0.3)?.id, 'rotate');
});

test('renderer escala la fuente, conserva multilinea y aplica rotación', () => {
  const ctx = createContext();
  const item = createText2D({
    id: 'text-1',
    geometry: { x: 1, y: 2, rotation: Math.PI / 4 },
    text: 'Uno\nDos',
    style: { fontSize: 0.25, align: 'center' },
  });
  assert.equal(drawText2D(ctx, item, { toCanvas: (x, y) => [x * 100, y * 100], scale: 100 }), true);
  assert.match(ctx.font, /25px Arial/);
  assert.deepEqual(ctx.calls.find((call) => call[0] === 'translate'), ['translate', 100, 200]);
  assert.deepEqual(ctx.calls.find((call) => call[0] === 'rotate'), ['rotate', -Math.PI / 4]);
  assert.equal(ctx.calls.filter((call) => call[0] === 'fillText').length, 2);
});
