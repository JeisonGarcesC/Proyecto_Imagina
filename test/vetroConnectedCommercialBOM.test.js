import test from 'node:test';
import assert from 'node:assert/strict';
import { Group } from 'three';
import { createVetroSystem } from '../src/mepal/vetro/factories/createVetroSystem.js';
import { connectVetroSystems, disconnectVetroSystems, restoreVetroSystemConnections } from '../src/mepal/vetro/system/vetroSystemConnections.js';
import { getVetroConnectedCommercialBOM } from '../src/mepal/vetro/bom/vetroSystemBOM.js';
import { serializeVetroSystem } from '../src/core/persistence/entitySerializers.js';
import { shouldShowBomCategoryHeading } from '../src/components/bomCategoryHeading.js';

async function system(config) {
  const result = await createVetroSystem({ heightMm: 2040, ...config });
  assert.equal(result.success, true, result.reason);
  return result.object;
}

function quantity(rows, code) {
  return rows.filter((row) => row.code === code).reduce((sum, row) => sum + row.quantity, 0);
}

test('single 90 + 90 line retains one 300 cm top/plinth pair and one internal 180 kit', async () => {
  const a = await system({ requestedWidthMm: 1800, panelWidthsMm: [900, 900] });
  const rows = getVetroConnectedCommercialBOM([a]);
  assert.equal(quantity(rows, '22000017629'), 1);
  assert.equal(quantity(rows, '22000017630'), 1);
  assert.equal(quantity(rows, '22000009791'), 1);
  assert.equal(quantity(rows, '22000011980'), 1);
});

test('three consecutive 1800 mm lines use two floor profiles for one 5400 mm run', async () => {
  const systems = await Promise.all(Array.from({ length: 3 }, () => system({ requestedWidthMm: 1800, panelWidthsMm: [900, 900] })));
  systems[1].position.x = 1.8;
  systems[2].position.x = 3.6;
  const scene = new Group(); scene.add(...systems);
  assert.equal((await connectVetroSystems({ source: systems[0], target: systems[1] })).success, true);
  assert.equal((await connectVetroSystems({ source: systems[1], target: systems[2] })).success, true);
  const rows = getVetroConnectedCommercialBOM(systems);
  assert.equal(quantity(rows, '22000009783'), 6);
  assert.equal(quantity(rows, '22000011980'), 2);
  assert.equal(quantity(rows, '22000009791'), 5);
  assert.equal(quantity(rows, '22000017631'), 1);
  assert.equal(quantity(rows, '22000017632'), 1);
});

test('6000 mm line has two floor profiles and a longer line is rejected', async () => {
  const line = await system({ requestedWidthMm: 6000, panelWidthsMm: [1200, 1200, 1200, 1200, 1200] });
  assert.equal(quantity(getVetroConnectedCommercialBOM([line]), '22000011980'), 2);
  const invalid = await createVetroSystem({ requestedWidthMm: 7200, heightMm: 2040, panelWidthsMm: [1200, 1200, 1200, 1200, 1200, 1200] });
  assert.equal(invalid.success, false);
});

test('a fourth 1800 mm line cannot extend a continuous run beyond 6000 mm', async () => {
  const systems = await Promise.all(Array.from({ length: 4 }, () => system({ requestedWidthMm: 1800, panelWidthsMm: [900, 900] })));
  systems.forEach((item, index) => { item.position.x = index * 1.8; });
  const scene = new Group(); scene.add(...systems);
  assert.equal((await connectVetroSystems({ source: systems[0], target: systems[1] })).success, true);
  assert.equal((await connectVetroSystems({ source: systems[1], target: systems[2] })).success, true);
  const rejected = await connectVetroSystems({ source: systems[2], target: systems[3] });
  assert.equal(rejected.success, false);
  assert.equal(rejected.reason, 'VETRO_CONTINUOUS_RUN_OVER_6000_MM');
});

test('two connected 90 + 90 lines use one 600 cm top/plinth pair, three joins, four panels and two floor profiles', async () => {
  const a = await system({ requestedWidthMm: 1800, panelWidthsMm: [900, 900] });
  const b = await system({ requestedWidthMm: 1800, panelWidthsMm: [900, 900] });
  b.position.x = 1.8;
  const scene = new Group(); scene.add(a, b);
  const before = getVetroConnectedCommercialBOM([a, b]);
  assert.equal(quantity(before, '22000017629'), 2);
  const connected = await connectVetroSystems({ source: a, target: b });
  assert.equal(connected.success, true, connected.reason);
  const rows = getVetroConnectedCommercialBOM([a, b]);
  assert.equal(new Set(rows.map((row) => row.groupId)).size, 1);
  assert.equal(quantity(rows, '22000009791'), 3);
  assert.equal(quantity(rows, '22000017631'), 1);
  assert.equal(quantity(rows, '22000017632'), 1);
  assert.equal(quantity(rows, '22000017629'), 0);
  assert.equal(quantity(rows, '22000017630'), 0);
  assert.equal(quantity(rows, '22000009783'), 4);
  assert.equal(quantity(rows, '22000011980'), 2);
  const savedA = serializeVetroSystem(a);
  const savedB = serializeVetroSystem(b);
  const loadedA = (await createVetroSystem(savedA)).object;
  const loadedB = (await createVetroSystem(savedB)).object;
  const loadedScene = new Group(); loadedScene.add(loadedA, loadedB);
  await restoreVetroSystemConnections([loadedA, loadedB]);
  assert.equal(quantity(getVetroConnectedCommercialBOM([loadedA, loadedB]), '22000017631'), 1);
  disconnectVetroSystems(a, connected.relation.connectionId);
  assert.equal(quantity(getVetroConnectedCommercialBOM([a, b]), '22000017629'), 2);
});

for (const [widths, stockCode] of [
  [[1200, 900, 900], '22000017629'],
  [[1200, 1200, 900], '22000017631'],
  [[1200, 1200, 1200, 1200, 1200], '22000017631'],
]) {
  test(`continuous line of ${widths.reduce((sum, width) => sum + width, 0)} mm selects documented horizontal stock`, async () => {
    const root = await system({ requestedWidthMm: widths.reduce((sum, width) => sum + width, 0), panelWidthsMm: widths });
    const rows = getVetroConnectedCommercialBOM([root]);
    assert.equal(quantity(rows, stockCode), 1);
  });
}

for (const shape of ['L', 'T']) {
  test(`${shape} keeps main and perpendicular arms as separate commercial runs`, async () => {
    const root = await system({ shape, requestedWidthMm: 1800, panelWidthsMm: [900, 900], returnWidthMm: 1800, returnPanelWidthsMm: [900, 900] });
    const rows = getVetroConnectedCommercialBOM([root]);
    assert.equal(quantity(rows, '22000017629'), 2);
    assert.equal(quantity(rows, '22000017630'), 2);
    assert.equal(quantity(rows, '22000017631'), 0);
    assert.equal(quantity(rows, shape === 'L' ? '22000009792' : '22000009793'), 1);
  });
}

test('Vetro typology hides technical category headings while keeping commercial rows', () => {
  assert.equal(shouldShowBomCategoryHeading({ groupMode: 'typology', row: { category: 'JOIN_180', hideCategoryHeading: true }, index: 0 }), false);
  assert.equal(shouldShowBomCategoryHeading({ groupMode: 'typology', row: { category: 'PANEL', hideCategoryHeading: true }, previousRow: { category: 'JOIN_180' }, index: 1 }), false);
  assert.equal(shouldShowBomCategoryHeading({ groupMode: 'typology', row: { category: 'PANELS' }, index: 0 }), true);
});
