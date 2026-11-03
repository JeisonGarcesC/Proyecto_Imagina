import test from 'node:test';
import assert from 'node:assert/strict';
import { planVetroLine } from '../src/mepal/vetro/composition/vetroLinePlanner.js';
import { createVetroSystem } from '../src/mepal/vetro/factories/createVetroSystem.js';
import { getVetroSystemBOM } from '../src/mepal/vetro/bom/vetroSystemBOM.js';
import { serializeVetroSystem, serializeProjectEntities } from '../src/core/persistence/entitySerializers.js';
import { createVetroInstance } from '../src/mepal/vetro/factories/createVetroInstance.js';
import { registerVetroSystem } from '../src/mepal/vetro/integration/vetroSystemRegistration.js';
import { loadPersistedEntity } from '../src/core/persistence/entityLoaders.js';
import { createPasteInstructions, CLIPBOARD_CONSTRUCTORS } from '../src/clipboard/clipboardPasteFactory.js';
import { Group } from 'three';

test('Vetro Line planner retains multiple commercial compositions without claiming exterior accuracy', () => {
  const plan = planVetroLine({ requestedWidthMm: 1800, heightMm: 2040 });
  assert.equal(plan.success, true);
  assert.ok(plan.compositions.some((item) => item.panelWidthsMm.join(',') === '900,900'));
  assert.ok(plan.compositions.some((item) => item.panelWidthsMm.join(',') === '1200,600'));
  assert.ok(plan.compositions.every((item) => item.measuredWidthMm === null));
  assert.equal(planVetroLine({ requestedWidthMm: 1800, heightMm: 3180 }).success, false);
});

for (const widths of [[900], [900, 900], [900, 900, 900]]) {
  test(`Vetro Line system joins ${widths.length} panels as one movable root`, async () => {
    const requestedWidthMm = widths.reduce((sum, width) => sum + width, 0);
    const result = await createVetroSystem({ requestedWidthMm, heightMm: 2040, panelWidthsMm: widths });
    assert.equal(result.success, true, result.reason);
    const root = result.object;
    assert.equal(root.userData.kind, 'VETRO_SYSTEM');
    assert.equal(root.userData.measurement.status, 'PROVISIONAL_GEOMETRY');
    assert.equal(root.userData.connections.length, widths.length - 1);
    assert.equal(root.children.length, widths.length + widths.length - 1 + 3);
    const panel = root.children.find((child) => child.userData.product?.productType === 'PANEL');
    assert.ok(Math.abs(panel.scale.y * 2040 - 1970.5) < 1e-6);
    assert.equal(panel.userData.product.dimensions.nominalHeightCm, 204);
    const original = root.children[0].getWorldPosition(root.position.clone());
    root.position.x += 1;
    root.updateMatrixWorld(true);
    assert.ok(Math.abs(root.children[0].getWorldPosition(root.position.clone()).x - original.x - 1) < 1e-6);
    const bom = getVetroSystemBOM(root);
    assert.equal(bom.reduce((sum, row) => sum + row.quantity, 0), widths.length * 2 + 2);
    assert.ok(bom.every((row) => row.code));
    assert.equal(bom.find((row) => row.code === '22000009783')?.quantity, widths.length);
    assert.equal(bom.find((row) => row.code === '22000009791')?.quantity || 0, widths.length - 1);
    assert.equal(bom.find((row) => row.code === '22000011980')?.quantity, 1);
    assert.equal(bom.some((row) => row.code === '22000020804'), false);
    const saved = serializeVetroSystem(root);
    const restored = await createVetroSystem(saved);
    assert.equal(restored.success, true, restored.reason);
    assert.equal(restored.object.userData.systemId, saved.systemId);
    assert.equal(restored.object.userData.measurement.widthMm, root.userData.measurement.widthMm);
    assert.deepEqual(getVetroSystemBOM(restored.object), bom);
    const serialized = serializeProjectEntities([{ obj: root, code: null }, ...root.children.map((obj) => ({ obj, code: obj.userData.code }))]);
    assert.equal(serialized.entities.filter((entity) => entity.kind === 'VETRO_SYSTEM').length, 1);
    assert.equal(serialized.entities.filter((entity) => entity.kind === 'VETRO_PRODUCT').length, 0);
    const scene = new Group();
    const parts = [];
    const pickables = [];
    registerVetroSystem({ instance: result, parent: scene, partsRegistry: parts, pickables });
    assert.equal(parts.length, root.children.length + 1);
    assert.deepEqual(pickables, [root]);
    assert.equal(scene.children.length, 1);
    const loaded = await loadPersistedEntity(saved, { createVetroSystem: (entity) => createVetroSystem(entity).then((created) => created.object) });
    assert.equal(loaded.userData.kind, 'VETRO_SYSTEM');
  });
}

test('Vetro System clipboard resolves to its dedicated constructor', async () => {
  const result = await createVetroSystem({ requestedWidthMm: 900, heightMm: 2040, panelWidthsMm: [900] });
  const root = result.object;
  const instructions = createPasteInstructions({ version: 1, items: [{
    type: 'PHYSICAL_OBJECT', kind: 'VETRO_SYSTEM', metadata: root.userData,
    transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] },
  }] });
  assert.equal(instructions[0].constructor, CLIPBOARD_CONSTRUCTORS.ADD_VETRO_SYSTEM);
});

test('existing individual Vetro product creation remains available', async () => {
  const result = await createVetroInstance({ config: { category: 'PANELS', productType: 'PANEL', material: 'TEMPERED_GLASS_10MM', nominalWidthCm: 90, nominalHeightCm: 204 } });
  assert.equal(result.success, true);
  assert.equal(result.object.userData.kind, 'VETRO_PRODUCT');
  assert.equal(result.object.userData.codigoPT, '22000009783');
});

test('basic Vetro L keeps two arms in one system and includes its internal 90 kit', async () => {
  const result = await createVetroSystem({ shape: 'L', requestedWidthMm: 1800, panelWidthsMm: [900, 900], returnWidthMm: 1200, returnPanelWidthsMm: [1200], heightMm: 2040 });
  assert.equal(result.success, true, result.reason);
  assert.equal(result.object.userData.shape, 'L');
  assert.equal(result.object.userData.tramos.length, 2);
  assert.equal(result.object.userData.footprint2D.type, 'POLYGON');
  assert.equal(result.object.userData.footprint2D.points.length, 6);
  assert.equal(getVetroSystemBOM(result.object).find((row) => row.code === '22000009792')?.quantity, 1);
  const saved = serializeVetroSystem(result.object);
  const restored = await createVetroSystem(saved);
  assert.equal(restored.success, true, restored.reason);
  assert.equal(restored.object.userData.shape, 'L');
});

test('basic Vetro T has a branch, a single internal T kit and logical BOM', async () => {
  const result = await createVetroSystem({ shape: 'T', requestedWidthMm: 1800, panelWidthsMm: [900, 900], returnWidthMm: 900, returnPanelWidthsMm: [900], heightMm: 2040 });
  assert.equal(result.success, true, result.reason);
  const root = result.object;
  assert.equal(root.userData.tramos.length, 2);
  assert.equal(root.userData.footprint2D.points.length, 8);
  const bom = getVetroSystemBOM(root);
  assert.equal(bom.find((row) => row.code === '22000009793')?.quantity, 1);
  assert.equal(bom.find((row) => row.code === '22000009791'), undefined);
  assert.equal(bom.find((row) => row.code === '22000011980')?.quantity, 2);
  const saved = serializeVetroSystem(root);
  const restored = await createVetroSystem(saved);
  assert.equal(restored.success, true, restored.reason);
  assert.deepEqual(getVetroSystemBOM(restored.object), bom);
});

for (const [width, widths, expectedPanelCode] of [
  [1800, [900, 900], '22000009783'],
  [2400, [1200, 1200], '22000009787'],
]) {
  test(`Vetro Line ${width} × 2040 has documented commercial BOM without mesh duplication`, async () => {
    const result = await createVetroSystem({ requestedWidthMm: width, panelWidthsMm: widths, heightMm: 2040 });
    assert.equal(result.success, true, result.reason);
    const bom = getVetroSystemBOM(result.object);
    assert.deepEqual(Object.fromEntries(bom.map((row) => [row.code, row.quantity])), {
      [expectedPanelCode]: 2,
      '22000009791': 1,
      '22000017629': 1,
      '22000017630': 1,
      '22000011980': 1,
    });
    assert.equal(bom.reduce((sum, row) => sum + row.quantity, 0), 6);
  });
}

test('Vetro special one-panel system retains real size, billing SKU and persisted special status', async () => {
  const config = { requestedWidthMm: 850, heightMm: 2500, panelWidthsMm: [900], specialPanel: { nominalWidthCm: 90, nominalHeightCm: 204, realWidthMm: 850, projectHeightMm: 2500 } };
  const result = await createVetroSystem(config);
  assert.equal(result.success, true, result.reason);
  const panel = result.object.children.find((child) => child.userData.product?.productType === 'PANEL');
  assert.equal(panel.userData.product.special.realWidthMm, 850);
  assert.equal(panel.userData.product.special.projectHeightMm, 2500);
  assert.equal(getVetroSystemBOM(result.object).find((row) => row.code === '22000009785')?.special.special, true);
  const saved = serializeVetroSystem(result.object);
  const restored = await createVetroSystem(saved);
  assert.equal(restored.success, true, restored.reason);
  assert.equal(restored.object.userData.specialPanel.realWidthMm, 850);
});
