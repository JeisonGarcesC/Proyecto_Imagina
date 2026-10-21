import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWallDefinition } from '../src/core/architecture/walls/wallDefinition.js';
import { buildResolvedWallVolumes3D } from '../src/core/architecture/walls/wallGeometry3D.js';
import { createWallVolumeGeometry } from '../src/core/architecture/walls/wallExtrusion3D.js';
import { getWallFinishSurfaces } from '../src/core/architecture/walls/wallFinishSurfaces3D.js';
import { setArchitectureFinish, restoreArchitectureFinishes, architectureFinish2dCss,
  paintArchitectureFinishTarget,
  paintArchitectureRgbTarget } from '../src/specialFinishes/architectureSpecialFinishes.js';
import { getArchitectureTextureTileSize, applyColumnTextureUvs } from '../src/specialFinishes/architectureTextureUv.js';

const FINISH_ID = '123e4567-e89b-42d3-a456-426614174000';
const ASSET_ID = '123e4567-e89b-42d3-a456-426614174001';
const texture = new THREE.Texture({ width: 200, height: 100 });

function entry(entityType, entityId, revision = 1) {
  return { source: 'SPECIAL_FINISH', specialFinishId: FINISH_ID, revision,
    entityType, entityId, scope: 'ENTITY', textureScale: { tileWidth: 0.25 },
    snapshot: { specialFinishId: FINISH_ID, revision, name: 'Madera', type: 'TEXTURE',
      assetId: ASSET_ID, assetVersion: revision } };
}

function wall(id, x1, z1, x2, z2) {
  return createWallDefinition({ id, thickness: 0.2, height: 2.5,
    points: [{ id: `${id}-1`, x: x1, z: z1 }, { id: `${id}-2`, x: x2, z: z2 }] });
}

function renderWalls(definitions) {
  const group = new THREE.Group();
  for (const volume of buildResolvedWallVolumes3D(definitions)) {
    const geometry = createWallVolumeGeometry(volume);
    const materials = geometry.userData.wallFinishClasses.map(() =>
      new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.position.y = volume.baseElevation;
    mesh.userData.kind = 'WALL';
    mesh.userData.wallTextureSources = volume.sources;
    group.add(mesh);
  }
  return group;
}

test('snapshot de textura conserva recurso, revisión y escala física al restaurar', () => {
  const applied = entry('WALL', 'W1', 3);
  const project = JSON.parse(JSON.stringify({ specialFinishes: [applied] }));
  assert.deepEqual(restoreArchitectureFinishes(project, [{ id: 'W1' }]), [applied]);
  assert.equal(restoreArchitectureFinishes(project, [{ id: 'W2' }]).length, 0);
  assert.deepEqual(setArchitectureFinish([], 'WALL', 'W1', applied), [applied]);
  assert.deepEqual(getArchitectureTextureTileSize(texture, applied.textureScale),
    { width: 0.25, height: 0.125 });
});

test('el indicador 2D distingue texturas y revisiones y desaparece con la asignación', () => {
  const first = entry('WALL', 'W1', 1);
  const second = entry('WALL', 'W1', 2);
  assert.notEqual(architectureFinish2dCss(first), architectureFinish2dCss(second));
  assert.equal(setArchitectureFinish([first], 'WALL', 'W1', null).length, 0);
});

test('textura de W1 usa solo superficies exclusivas y vuelve al RGB/base', async () => {
  const definitions = [wall('W1', -1, 0, 1, 0), wall('W2', 0, -1, 0, 1)];
  const group = renderWalls(definitions);
  const assigned = entry('WALL', 'W1');
  const prepared = { definition: { mapTexture: texture } };
  assert.equal(await paintArchitectureFinishTarget(group, null, [assigned], 'WALL', 'W1',
    definitions, [], { prepareVisual: async () => prepared }), true);
  const exclusive = getWallFinishSurfaces(group, 'W1');
  assert.ok(exclusive.length > 0);
  for (const mesh of group.children) {
    const classes = mesh.geometry.userData.wallFinishClasses;
    classes.forEach((item, index) => {
      assert.equal(mesh.material[index].map, item.type === 'EXCLUSIVE' && item.wallIds[0] === 'W1'
        ? texture : null);
    });
  }
  const vertical = exclusive.find((surface) =>
    Math.abs(surface.mesh.geometry.getAttribute('normal').getY(surface.start)) < 0.5);
  assert.ok(vertical);
  const uv = vertical.mesh.geometry.getAttribute('uv');
  const position = vertical.mesh.geometry.getAttribute('position');
  const i = vertical.start;
  const vertices = [i, i + 1, i + 2];
  const verticalPair = vertices.flatMap((a) => vertices.map((b) => [a, b]))
    .find(([a, b]) => Math.abs(position.getY(a) - position.getY(b)) > 2);
  assert.ok(verticalPair);
  assert.ok(Math.abs(uv.getY(verticalPair[0]) - uv.getY(verticalPair[1])) > 19);
  const rgb = { ...assigned, textureScale: undefined,
    snapshot: { specialFinishId: FINISH_ID, revision: 1, name: 'Rojo', type: 'RGB',
      r: 255, g: 0, b: 0 } };
  paintArchitectureRgbTarget(group, null, [rgb], 'WALL', 'W1');
  assert.ok(exclusive.every((surface) => surface.mesh.material[surface.materialIndex].map === null));
  paintArchitectureRgbTarget(group, null, [], 'WALL', 'W1');
  assert.ok(exclusive.every((surface) => surface.mesh.material[surface.materialIndex]
    .color.getHex(THREE.SRGBColorSpace) === 0xdddddd));
});

test('columna rectangular y circular repiten según metros y proporción', () => {
  const tile = getArchitectureTextureTileSize(texture, { tileWidth: 0.25 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 2.5, 1));
  assert.equal(applyColumnTextureUvs(box, { shape: 'RECTANGLE' }, tile), true);
  const boxUv = box.geometry.getAttribute('uv');
  const vValues = Array.from({ length: boxUv.count }, (_, index) => boxUv.getY(index));
  assert.ok(Math.max(...vValues) - Math.min(...vValues) >= 19);
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.5, 16));
  assert.equal(applyColumnTextureUvs(cylinder, { diameter: 0.5 }, tile), true);
  const after = cylinder.geometry.getAttribute('uv');
  const cylinderU = Array.from({ length: after.count }, (_, index) => after.getX(index));
  const cylinderV = Array.from({ length: after.count }, (_, index) => after.getY(index));
  assert.ok(Math.max(...cylinderU) > 6);
  assert.ok(Math.max(...cylinderV) - Math.min(...cylinderV) >= 19);
});

test('muros horizontales, verticales y diagonales mantienen escala de U en metros', async () => {
  for (const [x, z] of [[2, 0], [0, 2], [Math.SQRT2, Math.SQRT2]]) {
    const definition = wall('W1', 0, 0, x, z);
    const group = renderWalls([definition]);
    await paintArchitectureFinishTarget(group, null, [entry('WALL', 'W1')], 'WALL', 'W1',
      [definition], [], { prepareVisual: async () => ({ definition: { mapTexture: texture } }) });
    const mesh = group.children[0];
    const normal = mesh.geometry.getAttribute('normal');
    const uv = mesh.geometry.getAttribute('uv');
    const values = [];
    for (let index = 0; index < uv.count; index += 1) {
      if (Math.abs(normal.getY(index)) < 0.5) values.push(uv.getX(index));
    }
    assert.ok(Math.max(...values) - Math.min(...values) > 7.9, `${x},${z}`);
  }
});
