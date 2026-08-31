import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDuctCimbraGeometry,
  getDuctCimbras,
  pruneCimbraVisibility,
  resolveSelectedKoncisaPostId,
} from '../src/plan2d/koncisaCimbraGeometry2D.js';

function duct(overrides = {}) {
  return {
    id: 'duct-1',
    instanceId: 'duct-1',
    groupId: 'puesto-a',
    type: 'ductoPiso',
    x: 1.25,
    z: -0.4,
    w: 0.13,
    d: 0.1,
    rotY: Math.PI / 2,
    meta: { tipoPuesto: 'sencillo', tipoPasoCable: 'grommet' },
    ...overrides,
  };
}

test('sencillo estándar usa 74,3 × 77,3 mm y no el bounds2d del GLB', () => {
  const geometry = getDuctCimbraGeometry(duct());
  assert.ok(Math.abs(geometry.width - 0.0743) < Number.EPSILON);
  assert.ok(Math.abs(geometry.depth - 0.0773) < Number.EPSILON);
  assert.equal(geometry.dimensionSource, 'technical-config');
});

test('posición y rotación se leen del snapshot 3D actual', () => {
  const geometry = getDuctCimbraGeometry(duct({ x: 4, z: 3, rotY: Math.PI }));
  assert.deepEqual(
    { x: geometry.x, z: geometry.z, rotation: geometry.rotation },
    { x: 4, z: 3, rotation: Math.PI }
  );
});

test('puesto A ON y puesto B OFF solo genera la cimbra de A', () => {
  const parts = [duct(), duct({ id: 'duct-b', instanceId: 'duct-b', groupId: 'puesto-b' })];
  const cimbras = getDuctCimbras(parts, { visiblePostIds: new Set(['puesto-a']) });
  assert.deepEqual(cimbras.map((item) => item.postId), ['puesto-a']);
});

test('A y C conservan visibilidad independiente', () => {
  const parts = [
    duct(),
    duct({ id: 'duct-b', instanceId: 'duct-b', groupId: 'puesto-b' }),
    duct({ id: 'duct-c', instanceId: 'duct-c', groupId: 'puesto-c' }),
  ];
  const cimbras = getDuctCimbras(parts, {
    visiblePostIds: new Set(['puesto-a', 'puesto-c']),
  });
  assert.deepEqual(cimbras.map((item) => item.postId), ['puesto-a', 'puesto-c']);
});

test('puesto nuevo comienza OFF', () => {
  assert.deepEqual(getDuctCimbras([duct()], { visiblePostIds: new Set() }), []);
});

test('eliminar un puesto limpia su estado huérfano', () => {
  const remaining = [duct({ id: 'duct-b', instanceId: 'duct-b', groupId: 'puesto-b' })];
  const pruned = pruneCimbraVisibility(new Set(['puesto-a', 'puesto-b']), remaining);
  assert.deepEqual(Array.from(pruned), ['puesto-b']);
});

test('resuelve el puesto seleccionado por pieza o por groupId', () => {
  const parts = [duct()];
  assert.equal(resolveSelectedKoncisaPostId(parts, ['duct-1']), 'puesto-a');
  assert.equal(resolveSelectedKoncisaPostId(parts, ['puesto-a']), 'puesto-a');
});

test('piso y techo del mismo puesto generan dos cimbras cuando está ON', () => {
  const cimbras = getDuctCimbras([duct(), duct({ id: 'ceiling', type: 'ductoTecho' })], {
    visiblePostIds: new Set(['puesto-a']),
  });
  assert.deepEqual(cimbras.map((item) => item.destination), ['PISO', 'TECHO']);
});

test('acepta dimensión técnica explícita para variantes sin tabla confirmada', () => {
  const geometry = getDuctCimbraGeometry(
    duct({
      meta: {
        tipoPuesto: 'doble',
        tipoPasoCable: 'pasacable',
        cimbraDimensionsMm: { widthMm: 80, depthMm: 90 },
      },
    })
  );
  assert.equal(geometry.width, 0.08);
  assert.equal(geometry.depth, 0.09);
  assert.equal(geometry.dimensionSource, 'metadata');
});

test('no usa bounds2d como fallback para una variante sin dimensión confirmada', () => {
  assert.equal(
    getDuctCimbraGeometry(
      duct({ meta: { tipoPuesto: 'doble', tipoPasoCable: 'pasacable' } })
    ),
    null
  );
});
