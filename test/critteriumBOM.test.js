import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { prepareCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import { defaultCritteriumSequenceDraft, validateCritteriumSequenceDraft } from '../src/mepal/critterium8/integration/critterium8Configurator.js';
import { createCritteriumSystemFromSequences } from '../src/mepal/critterium8/system/critteriumSystem.js';
import { resolveCritterium8BOM } from '../src/mepal/critterium8/bom/critterium8BOM.js';

function normalize(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row.code, row.reference, row.description, row.materialCode, row.finishCode]);
    grouped.set(key, { code: row.code, reference: row.reference, description: row.description,
      materialCode: row.materialCode, finishCode: row.finishCode,
      qty: (grouped.get(key)?.qty || 0) + row.qty });
  }
  return [...grouped.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function registry(...objects) {
  return objects.map((obj) => ({ obj }));
}

async function buildSequence(draft, offsetZ = 0) {
  const plan = validateCritteriumSequenceDraft(draft);
  assert.equal(plan.success, true, plan.reason);
  const scene = new THREE.Scene();
  const frames = [];
  for (const placement of plan.placements) {
    const position = [...placement.position]; position[2] += offsetZ;
    const created = await createCritterium8Instance({ ...placement.config, transform: { position, rotation: [0, placement.rotationY, 0] } });
    scene.add(created.assembly);
    frames.push(created.assembly);
  }
  const prepared = prepareCritterium8Sequence({ frameAssemblies: frames });
  assert.equal(prepared.success, true, prepared.reason);
  scene.add(prepared.sequenceRoot);
  return { frames, sequence: prepared.sequenceRoot };
}

test('un frame emite su código documentado y componentes codificados con datos comerciales', async () => {
  const created = await createCritterium8Instance({ widthCm: 90, heightCm: 90 });
  const { rows, diagnostics } = resolveCritterium8BOM(registry(created.assembly, ...created.assembly.children));
  assert.deepEqual(rows, [{ code: '22191900004', reference: null, description: 'Marco Critterium 8 90 × 90 cm',
    qty: 1, materialCode: null, finishCode: null, category: 'CRITTERIUM_8', sourceId: created.assembly.userData.frameId }]);
  assert.deepEqual(diagnostics, []);
});

test('dos frames iguales suman dos; tiles de distintos acabados permanecen separados', async () => {
  const a = await createCritterium8Instance({ widthCm: 90, heightCm: 90,
    tiles: [{ tileType: 'FORMICA', heightCm: 38, materialCode: 'M1', finishCode: 'X' }] });
  const b = await createCritterium8Instance({ widthCm: 90, heightCm: 90,
    tiles: [{ tileType: 'FORMICA', heightCm: 38, materialCode: 'M1', finishCode: 'Y' }] });
  const result = resolveCritterium8BOM(registry(a.assembly, b.assembly, a.assembly.children[0], b.assembly.children[0]));
  assert.deepEqual(normalize(result.rows.filter((row) => row.description.startsWith('Marco Critterium'))), [{ code: '22191900004', reference: null,
    description: 'Marco Critterium 8 90 × 90 cm', materialCode: null, finishCode: null, qty: 2 }]);
  const variants = result.rows.filter((row) => row.description === 'Baldosa FORMICA');
  assert.deepEqual(variants.map(({ code, reference, qty, materialCode, finishCode }) => ({ code, reference, qty, materialCode, finishCode })), [
    { code: '22191301823', reference: null, qty: 1, materialCode: 'M1', finishCode: 'X' },
    { code: '22191301823', reference: null, qty: 1, materialCode: 'M1', finishCode: 'Y' },
  ]);
});

test('secuencia y sistema suman frames y junctions una sola vez; flujo anterior coincide', async () => {
  const draft = defaultCritteriumSequenceDraft();
  const first = await buildSequence(draft);
  const second = await buildSequence(draft, 2);
  const firstRows = resolveCritterium8BOM(registry(...first.frames, first.sequence)).rows;
  const oldRouteRows = resolveCritterium8BOM(registry(...first.frames, first.sequence, ...first.frames.flatMap((frame) => frame.children))).rows;
  assert.deepEqual(normalize(firstRows), normalize(oldRouteRows));
  assert.equal(firstRows.filter((row) => row.description.startsWith('Marco Critterium')).length, 2);
  assert.equal(firstRows.filter((row) => row.description.startsWith('Kit de unión')).length,
    first.sequence.userData.sequence.junctions.filter((junction) => junction.metadata?.useDuct !== true).length);
  const system = createCritteriumSystemFromSequences([first.sequence, second.sequence]);
  const combined = resolveCritterium8BOM(registry(...first.frames, ...second.frames, first.sequence, second.sequence, system, ...first.frames)).rows;
  assert.deepEqual(normalize(combined), normalize([...firstRows, ...resolveCritterium8BOM(registry(...second.frames, second.sequence)).rows]));
  assert.equal(combined.some((row) => row.code === system.userData.systemId || row.code === first.sequence.userData.sequenceId), false);
});

test('secuencia de tres frames conserva el tercer marco y contabiliza cada junction una vez', async () => {
  const draft = defaultCritteriumSequenceDraft();
  draft.frames.push({ ...draft.frames[0] });
  const { frames, sequence } = await buildSequence(draft);
  const rows = resolveCritterium8BOM(registry(...frames, sequence, ...frames)).rows;
  assert.equal(rows.filter((row) => row.description.startsWith('Marco Critterium')).length, 3);
  assert.equal(rows.filter((row) => row.description.startsWith('Kit de unión')).length,
    sequence.userData.sequence.junctions.filter((junction) => junction.metadata?.useDuct !== true).length);
});

test('combinación sin código documentado queda diagnosticada', async () => {
  const created = await createCritterium8Instance({ widthCm: 105, heightCm: 90 });
  const result = resolveCritterium8BOM(registry(created.assembly));
  assert.equal(result.rows.some((row) => row.code === created.assembly.userData.instanceId), false);
  assert.equal(result.diagnostics.some((item) => item.code === 'MISSING_DOCUMENTED_FRAME_CODE'), true);
});
