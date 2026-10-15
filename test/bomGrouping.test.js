import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveBomGroupInstanceId,
  resolveKoncisaBomConfigurationKey,
  resolveKuoAVBomConfigurationKey,
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

test('agrupa puestos Kuo AV iguales aunque cada instancia tenga IDs distintos', () => {
  const config = {
    anchoMm: 1200,
    profundidadMm: 600,
    alturaMm: 730,
    kitFuenteColor: 'Blanco',
    acabadoGrommet: 'ALUMINIUM',
  };
  const first = createObject({
    kind: 'KUO_AV_DOBLE_ASSEMBLY',
    instanceId: 'KUOAVD_first',
    uuid: 'first',
  });
  const second = createObject({
    kind: 'KUO_AV_DOBLE_ASSEMBLY',
    instanceId: 'KUOAVD_second',
    uuid: 'second',
  });
  first.userData.groupName = 'Puesto Doble Kuo AV';
  second.userData.groupName = 'Puesto Doble Kuo AV';
  first.userData.config = {
    ...config,
    instanceId: 'KUOAVD_first',
    groupId: 'first',
    position: [0, 0, 0],
    costadoIntermedio: false,
    kuoBatchIndex: 0,
    kuoBatchSize: 2,
  };
  second.userData.config = {
    ...config,
    instanceId: 'KUOAVD_second',
    groupId: 'second',
    position: [3, 0, 0],
    costadoIntermedio: false,
    kuoBatchIndex: 1,
    kuoBatchSize: 2,
  };

  assert.equal(resolveKuoAVBomConfigurationKey(first), resolveKuoAVBomConfigurationKey(second));
});

test('mantiene separados puestos Kuo AV con opciones comerciales diferentes', () => {
  const first = createObject({ kind: 'KUO_AV_DOBLE_ASSEMBLY', uuid: 'first' });
  const second = createObject({ kind: 'KUO_AV_DOBLE_ASSEMBLY', uuid: 'second' });
  first.userData.config = { anchoMm: 1200, acabadoGrommet: 'ALUMINIUM' };
  second.userData.config = { anchoMm: 1200, acabadoGrommet: 'PAINTED' };

  assert.notEqual(resolveKuoAVBomConfigurationKey(first), resolveKuoAVBomConfigurationKey(second));
  assert.notEqual(
    resolveKuoAVBomConfigurationKey(first),
    resolveKuoAVBomConfigurationKey({
      userData: { ...first.userData, kind: 'KUO_AV_ASSEMBLY' },
    })
  );
});
