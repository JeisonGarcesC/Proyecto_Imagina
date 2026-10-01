import test from 'node:test';
import assert from 'node:assert/strict';
import { createMultipleInstance } from '../src/mepal/multiple/factories/createMultipleInstance.js';
import { serializeMultipleEntity, restoreMultipleEntity } from '../src/mepal/multiple/serialization/multipleSerialization.js';
import { registerMultipleInstance } from '../src/mepal/multiple/integration/multipleIntegration.js';
import { Group } from 'three';

test('columns are independent selectable component groups', () => {
  const instance = createMultipleInstance({ instanceId: 'COLUMN-1', config: { widthCm: 90, heightCm: 90,
    columns: [{ componentKey: 'column-0', type: 'JUNCTION', side: 'LEFT' }] } });
  const column = instance.object.children.find((child) => child.userData.componentKey === 'column-0');
  assert.equal(column.userData.kind, 'MULTIPLE_COMPONENT'); assert.equal(column.userData.componentRole, 'COLUMN_JUNCTION');
  assert.equal(column.userData.parentAssemblyId, 'COLUMN-1');
});

test('phase 2 config and overrides persist without geometry serialization', () => {
  const instance = createMultipleInstance({ instanceId: 'SERIAL-2', config: { widthCm: 90, heightCm: 204,
    growth: { enabled: true, targetHeightCm: 242 }, columns: [{ componentKey: 'column-0', type: 'STRUCTURAL' }],
    components: { 'growth-0': { finish: 'PAINTED_GRAY', transformOverride: { position: [0.1, 0, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] } } } } });
  const entity = serializeMultipleEntity(instance.object); const restored = restoreMultipleEntity(entity);
  assert.equal(entity.geometry, undefined); assert.equal(restored.object.userData.config.growth.targetHeightCm, 242);
  assert.equal(restored.object.userData.config.columns[0].type, 'STRUCTURAL');
});

test('documented wall-arrival cable tray is a separate physical component', () => {
  const instance = createMultipleInstance({ instanceId: 'TRAY-1', config: { widthCm: 90, heightCm: 128, cableTray: { enabled: true, side: 'RIGHT' } } });
  const tray = instance.object.children.find((child) => child.userData.componentRole === 'CABLE_TRAY');
  assert.equal(tray.userData.codigoPT, '22191300710'); assert.equal(tray.userData.parentAssemblyId, 'TRAY-1');
});

test('selection registers only MULTIPLE_PRODUCT in pickables', () => {
  const instance = createMultipleInstance({ instanceId: 'PICK-1', config: { widthCm: 90, heightCm: 90 } });
  const pickables = []; const partsRegistry = [];
  registerMultipleInstance({ instance, parent: new Group(), partsRegistry, pickables });
  assert.deepEqual(pickables, [instance.object]);
  assert.equal(partsRegistry.some((entry) => entry.obj.userData.kind === 'MULTIPLE_COMPONENT'), true);
});
