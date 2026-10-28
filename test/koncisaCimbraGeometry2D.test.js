import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDuctCimbraGeometry,
  getDuctCimbras,
  getLeaderWallCimbras,
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
  assert.equal(geometry.type, 'rectangle');
  assert.equal(geometry.semanticType, 'cimbra');
  assert.ok(Math.abs(geometry.geometry.width - 0.0743) < Number.EPSILON);
  assert.ok(Math.abs(geometry.geometry.height - 0.0773) < Number.EPSILON);
  assert.equal(geometry.metadata.dimensionSource, 'technical-config');
});

test('posición y rotación se leen del snapshot 3D actual', () => {
  const geometry = getDuctCimbraGeometry(duct({ x: 4, z: 3, rotY: Math.PI }));
  assert.deepEqual(
    { x: geometry.geometry.x, z: geometry.geometry.y, rotation: geometry.geometry.rotation },
    { x: 4, z: 3, rotation: Math.PI }
  );
});

test('puesto A ON y puesto B OFF solo genera la cimbra de A', () => {
  const parts = [duct(), duct({ id: 'duct-b', instanceId: 'duct-b', groupId: 'puesto-b' })];
  const cimbras = getDuctCimbras(parts, { visiblePostIds: new Set(['puesto-a']) });
  assert.deepEqual(cimbras.map((item) => item.metadata.postId), ['puesto-a']);
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
  assert.deepEqual(cimbras.map((item) => item.metadata.postId), ['puesto-a', 'puesto-c']);
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
  assert.deepEqual(cimbras.map((item) => item.metadata.destination), ['PISO', 'TECHO']);
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
  assert.equal(geometry.geometry.width, 0.08);
  assert.equal(geometry.geometry.height, 0.09);
  assert.equal(geometry.metadata.dimensionSource, 'metadata');
});

test('no usa bounds2d como fallback para una variante sin dimensión confirmada', () => {
  assert.equal(
    getDuctCimbraGeometry(
      duct({ meta: { tipoPuesto: 'doble', tipoPasoCable: 'pasacable' } })
    ),
    null
  );
});

test('líder: cimbra de piso técnica sigue posición y giros del ducto principal o retorno', () => {
  for (const [role, rotation] of [
    ['MAIN_FLOOR_DUCT', 0], ['RETURN_FLOOR_DUCT', Math.PI / 2],
    ['MAIN_FLOOR_DUCT', Math.PI], ['RETURN_FLOOR_DUCT', 3 * Math.PI / 2],
  ]) {
    const part = duct({
      x: 3, z: -2, rotY: rotation,
      meta: { layoutType: 'LEADER', leaderRole: role, category: 'ductos-a-piso' },
    });
    const [shape] = getDuctCimbras([part], { visiblePostIds: new Set(['puesto-a']) });
    assert.equal(shape.geometry.x, 3);
    assert.equal(shape.geometry.y, -2);
    assert.equal(shape.geometry.rotation, rotation);
    assert.equal(shape.geometry.width, 0.1);
    assert.equal(shape.geometry.height, 0.043);
  }
  assert.deepEqual(getDuctCimbras([], { visiblePostIds: new Set(['puesto-a']) }), []);
  assert.deepEqual(getDuctCimbras([duct({ meta: { layoutType: 'LEADER' } })]), []);
});

test('líder: cimbra de pared sigue el acople y cambia de eje con orientación y alzado', () => {
  const elevation = {
    id: 'alz-a', type: 'elevation', viewDirection: 'front',
    sourceSelection: ['puesto-a'], geometry: { x: 10, y: 20 },
  };
  const coupling = {
    id: 'acople', instanceId: 'acople', groupId: 'puesto-a',
    subtype: 'leader-outlet-wall-coupling', meta: { layoutType: 'LEADER' },
    cimbraWorldCenter: { x: 2, y: 0.7, z: 3 }, rotY: 0,
  };
  const root = { id: 'puesto-a', groupId: 'puesto-a' };
  const getSource = () => ({ sourceBoxes: [{
    min: { x: 0, y: 0, z: 0 }, max: { x: 4, y: 1, z: 4 },
  }] });
  const visible = new Set(['puesto-a']);
  const front = getLeaderWallCimbras([root, coupling], [elevation], visible, getSource);
  assert.equal(front.length, 1);
  assert.deepEqual(front[0].geometry, {
    x: 10, y: 19.8, width: 0.23, height: 0.085, rotation: 0,
  });
  assert.deepEqual(getLeaderWallCimbras([root, coupling], [elevation], new Set(), getSource), []);
  assert.deepEqual(getLeaderWallCimbras([root], [elevation], visible, getSource), []);

  const rightCoupling = { ...coupling, cimbraWorldCenter: { x: -2, y: 0.7, z: 3 }, rotY: Math.PI / 2 };
  const right = getLeaderWallCimbras(
    [root, rightCoupling], [{ ...elevation, viewDirection: 'left' }], visible, getSource
  );
  assert.equal(right.length, 1);
  assert.equal(right[0].geometry.x, 11);
  assert.deepEqual(
    getLeaderWallCimbras([root, rightCoupling], [elevation], visible, getSource), []
  );
  const moved = getLeaderWallCimbras(
    [root, { ...rightCoupling, cimbraWorldCenter: { x: -2, y: 0.7, z: -1 } }],
    [{ ...elevation, viewDirection: 'left' }], visible, getSource
  );
  assert.equal(moved[0].geometry.x, 7);
  for (const [viewDirection, rotY] of [
    ['back', Math.PI], ['right', 3 * Math.PI / 2],
  ]) {
    assert.equal(getLeaderWallCimbras(
      [root, { ...coupling, rotY }], [{ ...elevation, viewDirection }], visible, getSource
    ).length, 1);
  }
});
