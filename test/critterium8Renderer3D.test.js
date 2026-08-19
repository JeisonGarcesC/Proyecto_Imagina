import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { createCritterium8FrameDefinition } from '../src/mepal/critterium8/definitions/frameDefinition.js';
import { applyGrowthModuleToComposition, buildCritterium8FrameComposition } from '../src/mepal/critterium8/composition/frameComposition.js';
import { resolveCritterium8FrameParts } from '../src/mepal/critterium8/parts/framePartResolver.js';
import { buildCritterium8FrameAssemblyLayout } from '../src/mepal/critterium8/layout/frameLayoutBuilder.js';
import { buildCritterium8Frame3D } from '../src/mepal/critterium8/builders/Critterium8RenderBuilder.js';
import { disposeCritterium8FrameAssembly3D } from '../src/mepal/critterium8/renderers/Critterium8FrameRenderer3D.js';
import { resolveCritterium8PartAsset } from '../src/mepal/critterium8/renderers/partAssetResolver.js';
import { cmToMeters } from '../src/mepal/critterium8/renderers/proceduralPartRenderer.js';

async function build(frame, composition = buildCritterium8FrameComposition(frame)) {
  const parts = resolveCritterium8FrameParts(frame, { composition }).parts;
  const layout = buildCritterium8FrameAssemblyLayout({ frame, composition, parts });
  const assembly = await buildCritterium8Frame3D({ frame, composition, parts, layout });
  return { assembly, parts, layout };
}

test('mapea Parts a renderer y centraliza cm a metros', () => {
  assert.equal(cmToMeters(125), 1.25);
  assert.equal(resolveCritterium8PartAsset({ type: 'FRAME_LEFT_POST' }).rendererKey, 'FRAME_POST');
  assert.equal(resolveCritterium8PartAsset({ type: 'TILE' }).rendererKey, 'TILE');
  assert.equal(resolveCritterium8PartAsset({ type: 'DUCT' }).type, 'PLACEHOLDER');
});

test('crea Group con transforms y metadata desde AssemblyLayout', async () => {
  const frame = createCritterium8FrameDefinition({ id: 'RENDER_90', widthCm: 60, heightCm: 90, tiles: [{ tileType: 'FORMICA', heightCm: 38 }] });
  const { assembly, layout } = await build(frame);
  assert.equal(assembly instanceof THREE.Group, true);
  assert.equal(assembly.userData.kind, 'CRITTERIUM_8_ASSEMBLY');
  assert.equal(assembly.children.length, layout.placements.length);
  const left = assembly.children.find((child) => child.userData.partType === 'FRAME_LEFT_POST');
  assert.equal(left.position.x, -0.3);
  assert.equal(left.userData.kind, 'CRITTERIUM_8_PART');
  assert.equal(left.userData.frameId, 'RENDER_90');
  assert.equal(left.userData.isPartRoot, true);
  const tile = assembly.children.find((child) => child.userData.partType === 'TILE');
  assert.equal(tile.userData.slotId.startsWith('C8_SLOT_'), true);
  assert.equal(assembly.userData.bounds.min.concat(assembly.userData.bounds.max).every(Number.isFinite), true);
  disposeCritterium8FrameAssembly3D(assembly);
});

test('quantity crea dos niveladores con distribución determinista', async () => {
  const frame = createCritterium8FrameDefinition({ id: 'QUANTITY', widthCm: 60, heightCm: 90 });
  const { assembly } = await build(frame);
  const leveler = assembly.children.find((child) => child.userData.partType === 'LEVELER');
  assert.equal(leveler.children.length, 2);
  assert.deepEqual(leveler.children.map((child) => child.position.x), [-0.28, 0.28]);
  assert.equal(leveler.userData.quantityStrategy, 'DETERMINISTIC_HORIZONTAL_DISTRIBUTION');
  disposeCritterium8FrameAssembly3D(assembly);
});

test('FULL_TILE renderiza únicamente la Part persistente', async () => {
  const frame = createCritterium8FrameDefinition({ id: 'RENDER_FULL', widthCm: 60, heightCm: 204, compositionMode: 'FULL_TILE', tiles: [{ tileType: 'FORMICA', heightCm: 190 }] });
  const { assembly } = await build(frame);
  assert.equal(assembly.children.filter((child) => child.userData.partType === 'TILE').length, 1);
  disposeCritterium8FrameAssembly3D(assembly);
});

test('renderiza growth sin alterar marco inferior', async () => {
  const base = createCritterium8FrameDefinition({ id: 'RENDER_GROW', widthCm: 60, heightCm: 90 });
  const grown = applyGrowthModuleToComposition(base, buildCritterium8FrameComposition(base));
  const frame = { ...base, heightCm: 128 };
  const { assembly } = await build(frame, grown.composition);
  assert.equal(assembly.children.find((child) => child.userData.partType === 'FRAME_LEFT_POST').position.y, 0.45);
  assert.equal(assembly.children.find((child) => child.userData.partType === 'GROWTH_MODULE').position.y, 1.09);
  disposeCritterium8FrameAssembly3D(assembly);
});

test('renderiza floor-to-ceiling y registra geometría provisional', async () => {
  const frame = createCritterium8FrameDefinition({ id: 'RENDER_FTC', frameMode: 'FLOOR_TO_CEILING', widthCm: 60, heightCm: 280 });
  const { assembly } = await build(frame);
  assert.equal(assembly.children.find((child) => child.userData.partType === 'CEILING_POST').position.y, 2.42);
  assert.equal(assembly.children.find((child) => child.userData.partType === 'CEILING_U').position.y, 2.8);
  assert.equal(assembly.userData.renderReport.diagnostics.some((item) => item.code === 'PROVISIONAL_GEOMETRY'), true);
  disposeCritterium8FrameAssembly3D(assembly);
});

test('genera placeholder y diagnóstico para tipo aún no renderizable', async () => {
  const frame = createCritterium8FrameDefinition({ id: 'PLACEHOLDER', widthCm: 60, heightCm: 90 });
  const composition = buildCritterium8FrameComposition(frame);
  const resolved = resolveCritterium8FrameParts(frame, { composition });
  const part = { ...resolved.parts[0], id: 'DUCT_PART', type: 'DUCT' };
  const layout = buildCritterium8FrameAssemblyLayout({ frame, composition, parts: resolved.parts });
  layout.placements.push({ ...layout.placements[0], id: 'DUCT_PLACE', partId: part.id, partType: 'DUCT' });
  const assembly = await buildCritterium8Frame3D({ frame, composition, parts: [...resolved.parts, part], layout });
  assert.equal(assembly.children.find((child) => child.userData.partId === part.id).userData.provisional, true);
  assert.equal(assembly.userData.renderReport.placeholderParts.includes(part.id), true);
  assert.equal(assembly.userData.renderReport.diagnostics.some((item) => item.code === 'MISSING_ASSET'), true);
  assert.equal(assembly.userData.renderReport.diagnostics.some((item) => item.code === 'UNSUPPORTED_RENDER_PART_TYPE'), true);
  disposeCritterium8FrameAssembly3D(assembly);
});
