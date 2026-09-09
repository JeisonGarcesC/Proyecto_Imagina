import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveBomGroupInstanceId,
  resolveKoncisaBomConfigurationKey,
} from '../src/utils/bomGrouping.js';

function createObject({ kind = null, instanceId = null, uuid, parent = null }) {
  return {
    uuid,
    parent,
    userData: { kind, instanceId },
  };
}

test('agrupa todas las piezas de un puesto Koncisa Plus por la instancia raíz', () => {
  const assembly = createObject({
    kind: 'KONCISA_PLUS_ASSEMBLY',
    instanceId: 'leader-1',
    uuid: 'assembly-uuid',
  });
  const costado = createObject({ instanceId: 'costado-1', uuid: 'costado-uuid', parent: assembly });
  const laminaA = createObject({ instanceId: 'lamina-a', uuid: 'lamina-a-uuid', parent: assembly });
  const laminaB = createObject({ instanceId: 'lamina-b', uuid: 'lamina-b-uuid', parent: assembly });

  assert.equal(resolveBomGroupInstanceId(costado), 'leader-1');
  assert.equal(resolveBomGroupInstanceId(laminaA), 'leader-1');
  assert.equal(resolveBomGroupInstanceId(laminaB), 'leader-1');
});

test('distingue dos puestos Koncisa Plus aunque compartan el mismo código de producto', () => {
  const leaderA = createObject({
    kind: 'KONCISA_PLUS_ASSEMBLY',
    instanceId: 'leader-a',
    uuid: 'leader-a-uuid',
  });
  const leaderB = createObject({
    kind: 'KONCISA_PLUS_ASSEMBLY',
    instanceId: 'leader-b',
    uuid: 'leader-b-uuid',
  });

  assert.equal(resolveBomGroupInstanceId(createObject({ uuid: 'part-a', parent: leaderA })), 'leader-a');
  assert.equal(resolveBomGroupInstanceId(createObject({ uuid: 'part-b', parent: leaderB })), 'leader-b');
});

test('conserva la identidad de una pieza que no pertenece a Koncisa Plus', () => {
  const loosePart = createObject({ instanceId: 'loose-1', uuid: 'loose-uuid' });
  assert.equal(resolveBomGroupInstanceId(loosePart), 'loose-1');
});

test('identifica como iguales dos configuraciones Koncisa ubicadas en lugares distintos', () => {
  const config = {
    puestos: 1,
    tipoPuesto: 'doble',
    largoRealMm: 1200,
    anchoRealMm: 1200,
    opcionesCostado: { forma: 'RECT' },
  };
  const leaderA = createObject({ kind: 'KONCISA_PLUS_ASSEMBLY', uuid: 'leader-a' });
  const leaderB = createObject({ kind: 'KONCISA_PLUS_ASSEMBLY', uuid: 'leader-b' });
  leaderA.userData.config = {
    ...config,
    groupId: 'KONCISA_A',
    position: [0, 0, 0],
    bomTypologyCode: '22000131997',
  };
  leaderB.userData.config = {
    ...config,
    groupId: 'KONCISA_B',
    position: [4, 0, 2],
    bomTypologyCode: '22000131999',
  };

  assert.equal(
    resolveKoncisaBomConfigurationKey(leaderA),
    resolveKoncisaBomConfigurationKey(leaderB)
  );
});

test('mantiene separadas configuraciones Koncisa comercialmente diferentes', () => {
  const rect = createObject({ kind: 'KONCISA_PLUS_ASSEMBLY', uuid: 'rect' });
  const curved = createObject({ kind: 'KONCISA_PLUS_ASSEMBLY', uuid: 'curved' });
  rect.userData.config = { puestos: 1, opcionesCostado: { forma: 'RECT' } };
  curved.userData.config = { puestos: 1, opcionesCostado: { forma: 'CURVO' } };

  assert.notEqual(
    resolveKoncisaBomConfigurationKey(rect),
    resolveKoncisaBomConfigurationKey(curved)
  );
});
