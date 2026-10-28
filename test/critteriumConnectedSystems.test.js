import assert from 'node:assert/strict';
import test from 'node:test';
import { Group } from 'three';
import { resolveCritteriumConnectedSystems } from '../src/mepal/critterium8/system/CritteriumConnectedSystems.js';

const system = (id, targets = []) => {
  const root = new Group();
  root.userData = {
    kind: 'CRITERIUM_SYSTEM',
    systemId: id,
    instanceId: id,
    connections: targets.map((targetSystemId) => ({ targetSystemId })),
  };
  return root;
};

test('resuelve la componente conectada desde ambos extremos y el centro', () => {
  const systems = [system('A', ['B']), system('B', ['C']), system('C'), system('D')];
  for (const id of ['A', 'B', 'C']) {
    assert.deepEqual(
      new Set(resolveCritteriumConnectedSystems(systems, id).map((item) => item.userData.systemId)),
      new Set(['A', 'B', 'C'])
    );
  }
  assert.deepEqual(resolveCritteriumConnectedSystems(systems, 'D'), [systems[3]]);
});

test('ignora relaciones internas y destinos de sistemas ausentes', () => {
  const systems = [system('A', ['A', 'missing']), system('B')];
  assert.deepEqual(resolveCritteriumConnectedSystems(systems, 'A'), [systems[0]]);
  assert.deepEqual(resolveCritteriumConnectedSystems(systems, 'missing'), []);
});
