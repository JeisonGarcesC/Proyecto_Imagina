import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createKuoAVInstance } from '../src/mepal/kuoAV/factory/createKuoAVInstance.js';
import { buildKuoAV } from '../src/mepal/kuoAV/builder/KuoAVBuilder.js';
import { buildKuoAVBOM } from '../src/mepal/kuoAV/bom/kuoAVBOMCatalog.js';
import { resolveKuoAVHeightPlacement } from '../src/mepal/kuoAV/config/kuoAVHeightPlacement.js';
import { syncKuoAVPerimetralScreenAttachment } from '../src/mepal/kuoAV/config/kuoAVPantallaPlacement.js';
import { createKuoAVPantallaInstance } from '../src/mepal/kuoAV/factory/createKuoAVPantallaInstance.js';
import { createKuoAVDobleInstance } from '../src/mepal/kuoAVDoble/factory/createKuoAVDobleInstance.js';
import { buildKuoAVDoble } from '../src/mepal/kuoAVDoble/builder/KuoAVDobleBuilder.js';
import { buildKuoAVDobleBOM } from '../src/mepal/kuoAVDoble/bom/kuoAVDobleBOMCatalog.js';
import { resolveKuoAVDobleHeightPlacement } from '../src/mepal/kuoAVDoble/config/kuoAVDobleHeightPlacement.js';

const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const cache = new Map();
async function loadGlb(candidates) {
  const path = candidates.map((candidate) =>
    join(publicRoot, ...decodeURI(candidate).split('/').filter(Boolean))
  ).find((candidate) => existsSync(candidate));
  assert.ok(path, `Missing GLB: ${candidates[0]}`);
  if (!cache.has(path)) {
    const buffer = readFileSync(path);
    cache.set(path, await new GLTFLoader().parseAsync(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), ''
    ));
  }
  return cache.get(path);
}
function box(object) {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object);
}
function close(actual, expected, tolerance = 0.0001) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
}
function child(object, role) {
  const result = object.children.find((item) => item.userData.role === role);
  assert.ok(result, role);
  return result;
}
function kits(object) {
  return object.children.filter((item) => item.userData.role === 'POWER_KIT');
}

test('height resolver retains nominal settings and measured CET surface planes', () => {
  const normal = resolveKuoAVHeightPlacement(730, 30);
  const raised = resolveKuoAVHeightPlacement(1200, 30);
  assert.equal(normal.surfaceBottomMm, 714);
  assert.equal(raised.surfaceBottomMm, 1200);
  assert.equal(raised.surfaceTravelMm, 486);
  assert.equal(raised.crossbarTravelMm, 491);
  assert.equal(resolveKuoAVHeightPlacement(500, 30).alturaMm, 730);
  assert.equal(resolveKuoAVHeightPlacement(1500, 30).alturaMm, 1200);
  assert.throws(() => resolveKuoAVHeightPlacement(NaN), TypeError);
});

test('real GLBs match normal/elevated CET planes and leave bases and lower duct fixed', async () => {
  const config = { anchoMm: 1200, profundidadMm: 600, thickMm: 30, kitFuente: true };
  const normal = (await createKuoAVInstance({ config: { ...config, alturaMm: 730 }, loadGlb })).object;
  const raised = (await createKuoAVInstance({ config: { ...config, alturaMm: 1200 }, loadGlb })).object;
  close(box(child(normal, 'SURFACE')).min.y, 0.714);
  close(box(child(raised, 'SURFACE')).min.y, 1.2);
  close(box(child(raised, 'CROSSBAR')).max.y, 1.201, 0.001);
  for (const role of ['LEFT_COLUMN', 'RIGHT_COLUMN', 'DUCT']) {
    assert.ok(box(child(normal, role)).equals(box(child(raised, role))), `${role} must remain fixed`);
  }
  for (const role of ['SURFACE', 'SOCKET_SUPPORT', 'GROMMET', 'CONTROL_PAD']) {
    const before = box(child(normal, role));
    const after = box(child(raised, role));
    close(after.min.y - before.min.y, 0.486);
    close(after.max.y - before.max.y, 0.486);
  }
  for (const [i, column] of kits(raised).entries()) {
    const bounds = box(column);
    close(bounds.min.y, 0.015);
    close(bounds.max.y, 1.157, 0.0001);
    close(box(kits(normal)[i]).max.y, 0.710, 0.0001);
    assert.deepEqual(column.scale.toArray(), [1, 1, 1]);
    assert.ok(bounds.max.y > box(child(raised, 'CROSSBAR')).min.y, 'Column contacts upper arms');
  }
  const vertebra = box(child(raised, 'VERTEBRA'));
  close(vertebra.min.y, 0.206632);
  close(vertebra.max.y, 1.113195);
  assert.ok(vertebra.max.y > box(child(raised, 'SOCKET_SUPPORT')).min.y);
  close(box(child(normal, 'GROMMET')).min.y, 0.712, 0.0001);
  assert.equal(raised.userData.config.alturaMm, 1200);
  assert.equal(raised.userData.config.physicalHeightMm, 1230);
});

test('height and lateral checkbox resolve separate native vertebra states without extra BOM items', async () => {
  for (const alturaMm of [730, 1200]) {
    for (const lateral of [false, true]) {
      const config = { alturaMm, vertebraLateral: lateral, kitFuente: true };
      const built = buildKuoAV(config);
      const vertebra = built.parts.find((item) => item.type === 'vertebra');
      const filename = alturaMm === 730
        ? lateral ? 'KUAC650000_LAT 1.glb' : 'KUAC650000.glb'
        : lateral ? 'KUAC650000_ALT_LAT 1.glb' : 'KUAC650000_ALT.glb';
      assert.ok(vertebra.model.src.endsWith(filename));
      assert.equal(built.config.vertebraLateral, lateral);
      const { object } = await createKuoAVInstance({ config, loadGlb });
      assert.deepEqual(child(object, 'VERTEBRA').scale.toArray(), [1, 1, 1]);
      if (lateral && alturaMm === 1200) {
        const bounds = box(child(object, 'VERTEBRA'));
        assert.ok(bounds.min.y < box(child(object, 'DUCT')).max.y);
        assert.ok(bounds.max.y > box(child(object, 'SOCKET_SUPPORT')).min.y);
      }
      assert.deepEqual(buildKuoAVBOM(built), buildKuoAVBOM(buildKuoAV({ ...config, alturaMm: 730 })));
    }
  }
});

test('all widths retain upper contacts, screen mounting and source assets across rebuilds', async () => {
  for (const anchoMm of [1200, 1500, 1650]) {
    const config = { anchoMm, alturaMm: 1200, kitFuente: true, pantalla: true };
    const { object } = await createKuoAVInstance({ config, loadGlb });
    const surface = box(child(object, 'SURFACE'));
    const screen = child(object, 'PANTALLA');
    let supportTop = -Infinity;
    screen.traverse((mesh) => {
      if (mesh.isMesh) {
        const bounds = box(mesh);
        if (bounds.max.y - bounds.min.y < 0.5) supportTop = Math.max(supportTop, bounds.max.y);
      }
    });
    close(supportTop, surface.min.y);
    close(box(child(object, 'CROSSBAR')).max.y, 1.201, 0.001);
    const restored = await createKuoAVInstance({ config: { ...config, alturaMm: 730 }, loadGlb });
    close(box(child(restored.object, 'SURFACE')).min.y, 0.714);
    for (const column of kits(restored.object)) close(box(column).max.y, 0.710);
    const rebuilt = await createKuoAVInstance({ config, loadGlb });
    assert.ok(box(rebuilt.object).equals(box(object)), 'Rebuild must not deform shared assets');
  }
});

test('legacy intermediate heights move only the upper segment, not the base or shared GLB', async () => {
  const { object } = await createKuoAVInstance({
    config: { alturaMm: 750, kitFuente: true }, loadGlb,
  });
  const { object: normal } = await createKuoAVInstance({
    config: { alturaMm: 730, kitFuente: true }, loadGlb,
  });
  for (const [i, column] of kits(object).entries()) {
    const before = kits(normal)[i];
    assert.ok(box(column.getObjectByName('3')).equals(box(before.getObjectByName('3'))));
    close(box(column.getObjectByName('4')).max.y - box(before.getObjectByName('4')).max.y,
      resolveKuoAVHeightPlacement(750).columnTravelMm / 1000);
  }
});

test('external perimetral screen follows physical height after rebuild and movement in a rotated group', async () => {
    const parent = new THREE.Group();
    parent.position.set(3, 0, -2);
    parent.rotation.y = Math.PI / 4;
    const { object: screen } = await createKuoAVPantallaInstance({
      config: { tipo: 'FRONTAL_PERIMETRAL', anchoMm: 1200 }, loadGlb,
    });
    parent.add(screen);
    screen.userData.attachment = {
      targetAssemblyId: 'HEIGHT_TEST',
      mode: 'PERIMETRAL_SCREEN_ATTACHMENT',
      offsetLocal: { x: 0, y: 0, z: 0 },
    };
    for (const alturaMm of [730, 1200, 730]) {
      const { object: desk } = await createKuoAVInstance({
        config: { alturaMm, instanceId: 'HEIGHT_TEST', kitFuente: true }, loadGlb,
      });
      parent.add(desk);
      desk.position.set(2, 0, 1);
      desk.rotation.y = Math.PI / 3;
      assert.equal(syncKuoAVPerimetralScreenAttachment(screen, desk), true);
      close(screen.userData.attachment.offsetLocal.y,
        resolveKuoAVHeightPlacement(alturaMm).surfaceBottomMm / 1000 - 0.0915);
      const expected = desk.localToWorld(new THREE.Vector3(0,
        screen.userData.attachment.offsetLocal.y, -0.3));
      assert.ok(screen.getWorldPosition(new THREE.Vector3()).distanceTo(expected) < 1e-8);
      desk.position.x += 1;
      syncKuoAVPerimetralScreenAttachment(screen, desk);
      const moved = desk.localToWorld(new THREE.Vector3(0,
        screen.userData.attachment.offsetLocal.y, -0.3));
      assert.ok(screen.getWorldPosition(new THREE.Vector3()).distanceTo(moved) < 1e-8);
      parent.remove(desk);
    }
});

test('left kit checkbox preserves the identical geometry exported by CET in both height states', async () => {
  for (const alturaMm of [730, 1200]) {
    const config = { alturaMm, kitFuente: true, vertebraLateral: false };
    const before = await createKuoAVInstance({
      config: { ...config, elevarKitFIzquierdo: false }, loadGlb,
    });
    const after = await createKuoAVInstance({
      config: { ...config, elevarKitFIzquierdo: true }, loadGlb,
    });
    assert.equal(after.object.userData.config.elevarKitFIzquierdo, true);
    assert.equal(after.object.userData.config.vertebraLateral, false);
    assert.equal(after.object.children.length, before.object.children.length);
    for (const [index, object] of after.object.children.entries()) {
      const original = before.object.children[index];
      assert.equal(object.userData.role, original.userData.role);
      assert.deepEqual(object.position.toArray(), original.position.toArray());
      assert.deepEqual(object.quaternion.toArray(), original.quaternion.toArray());
      assert.deepEqual(object.scale.toArray(), original.scale.toArray());
      assert.ok(box(object).equals(box(original)));
    }
    assert.deepEqual(after.metadata.bom, before.metadata.bom);
    const left = after.built.parts.find((part) => part.type === 'kit_fuente' && part.side === 'left');
    const right = after.built.parts.find((part) => part.type === 'kit_fuente' && part.side === 'right');
    assert.equal(left.meta.elevado, true);
    assert.equal(right.meta.elevado, false);
    const restored = await createKuoAVInstance({
      config: { ...after.object.userData.config, elevarKitFIzquierdo: false }, loadGlb,
    });
    assert.ok(box(restored.object).equals(box(before.object)));
  }
});

test('double real assets match CET height planes, four unscaled columns and fixed lower structure', async () => {
      for (const anchoMm of [1200, 1500, 1650]) {
        const normal = await createKuoAVDobleInstance({
          config: { anchoMm, alturaMm: 730, vertebraLateral: false }, loadGlb,
        });
        const raised = await createKuoAVDobleInstance({
          config: { anchoMm, alturaMm: 1200, vertebraLateral: true, elevarKitFIzquierdo: true }, loadGlb,
        });
        for (const [result, expectedBottom] of [[normal, 0.714], [raised, 1.201]]) {
          const { object, built } = result;
          for (const role of ['SURFACE_FRONT', 'SURFACE_BACK']) close(box(child(object, role)).min.y, expectedBottom);
          close(box(child(object, 'SURFACE_FRONT')).min.z - box(child(object, 'SURFACE_BACK')).max.z, 0.026);
          const columns = object.children.filter((item) => item.name.startsWith('Paral Elevable'));
          assert.equal(columns.length, 4);
          for (const column of columns) {
            close(box(column).min.y, 0.015);
            close(box(column).max.y, expectedBottom === 0.714 ? 0.710 : 1.157);
            assert.deepEqual(column.scale.toArray(), [1, 1, 1]);
          }
          assert.equal(built.parts.filter((part) => part.lookupTag === 'KUSO860000').length, 0);
          assert.equal(built.parts.some((part) => part.codigo === 'KUAC1040000_74Doble'), false);
          assert.equal(object.children.filter((item) => item.userData.type === 'vertebra').length, 2);
          assert.equal(object.children.filter((item) => item.userData.type === 'control').length, 2);
          assert.ok(box(object).min.y > -0.001, 'Do not reproduce CET control export artifact below floor');
        }
        for (const name of ['Pie Doble Izquierdo 1200', 'Pie Doble Derecho 1200', 'Ducto Central Inferior ' + anchoMm]) {
          assert.ok(box(normal.object.getObjectByName(name)).equals(box(raised.object.getObjectByName(name))));
        }
        for (const role of ['BEAM_FRONT', 'BEAM_BACK']) {
          close(box(child(raised.object, role)).max.y, 1.201, 0.0001);
          close(box(child(raised.object, role)).min.y - box(child(normal.object, role)).min.y, 0.491);
        }
        for (const name of ['Soporte Tomas Frontal', 'Soporte Tomas Posterior']) {
          close(box(raised.object.getObjectByName(name)).min.y - box(normal.object.getObjectByName(name)).min.y, 0.485);
        }
        close(box(raised.object.getObjectByName('Grommet Doble Abatible')).min.y, 1.203);
        const centralVertebra = box(child(normal.object, 'VERTEBRA_LEFT'));
        close(centralVertebra.min.x, -0.030);
        close(centralVertebra.max.y, 0.6517);
        close(centralVertebra.min.z, 0.047);
        const lateralVertebra = box(child(raised.object, 'VERTEBRA_LEFT'));
        close(lateralVertebra.min.x, anchoMm / 2000 - 0.3135);
        close(lateralVertebra.min.y, 0.4294);
        close(lateralVertebra.max.y, 1.0846);
        close(lateralVertebra.min.z, -0.0988);
        const screens = await createKuoAVDobleInstance({
          config: { anchoMm, alturaMm: 1200, pantalla: true, pantallaTipo: 'FRONTAL_PERIMETRAL' }, loadGlb,
        });
        let supportTop = -Infinity;
        child(screens.object, 'PANTALLA').traverse((mesh) => {
          if (!mesh.isMesh) return;
          const bounds = box(mesh);
          if (bounds.max.y - bounds.min.y < 0.5) supportTop = Math.max(supportTop, bounds.max.y);
        });
        close(supportTop, 1.201);
        assert.deepEqual(raised.built.bom, buildKuoAVDoble({
          ...raised.built.config, alturaMm: 730,
        }).bom);
        const restored = await createKuoAVDobleInstance({
          config: { ...normal.built.config }, loadGlb,
        });
        assert.ok(box(normal.object).equals(box(restored.object)));
      }
    });

    test('double lateral checkbox changes location rather than deleting standard vertebras', () => {
      const central = buildKuoAVDoble({ vertebraLateral: false });
      const lateral = buildKuoAVDoble({ vertebraLateral: true, alturaMm: 1200 });
      assert.equal(central.parts.filter((part) => part.type === 'vertebra').length, 2);
      for (const vertebraLateral of [false, true]) {
        const rows = buildKuoAVDobleBOM({ vertebraLateral });
        assert.equal(rows.find((row) => row.lookupTag === 'KUAC650000').quantity, 2);
      }
      assert.ok(central.parts.filter((part) => part.type === 'vertebra')
        .every((part) => part.glb.endsWith('KUAC650000.glb')));
      assert.ok(lateral.parts.filter((part) => part.type === 'vertebra')
        .every((part) => part.glb.endsWith('KUAC650000_ALT_LAT 1.glb')));
      assert.equal(lateral.config.physicalHeightMm, 1231);
      assert.equal(resolveKuoAVDobleHeightPlacement(750).alturaMm, 750);
      assert.equal(buildKuoAVDoble({ aumentarAltura: true }).config.alturaMm, 1200);
    });

test('double explicit height overrides a preserved raised flag and normalizes it', () => {
  const raised = buildKuoAVDoble({ aumentarAltura: true });
  assert.equal(raised.config.aumentarAltura, true);
  const lowered = buildKuoAVDoble({ ...raised.config, alturaMm: 730 });
  assert.equal(lowered.config.alturaMm, 730);
  assert.equal(lowered.config.physicalHeightMm, 744);
  assert.equal(lowered.config.aumentarAltura, false);
  assert.deepEqual(lowered.parts, buildKuoAVDoble({ ...lowered.config }).parts);
});

test('double attached screen follows rebuilt and moved desk at both measured heights', async () => {
  const { object: screen } = await createKuoAVPantallaInstance({
    config: { tipo: 'FRONTAL_PERIMETRAL', anchoMm: 1200 }, loadGlb,
  });
  const parent = new THREE.Group();
  parent.add(screen);
  screen.userData.attachment = {
    targetAssemblyId: 'DOUBLE_ATTACHMENT', mode: 'DESK_SCREEN_ATTACHMENT',
    offsetLocal: { x: 0, y: 0, z: 0.203 },
  };
  for (const alturaMm of [730, 1200, 730]) {
    const { object: desk, built } = await createKuoAVDobleInstance({
      config: { instanceId: 'DOUBLE_ATTACHMENT', alturaMm }, loadGlb,
    });
    parent.add(desk);
    desk.position.set(2, 0, 1);
    desk.rotation.y = Math.PI / 3;
    assert.equal(syncKuoAVPerimetralScreenAttachment(screen, desk), true);
    close(screen.userData.attachment.offsetLocal.y,
      (built.config.physicalHeightMm - built.config.thickMm) / 1000 - 0.0915);
    close(screen.userData.attachment.offsetLocal.z, 0.203);
    delete desk.userData.config.physicalHeightMm;
    syncKuoAVPerimetralScreenAttachment(screen, desk);
    close(screen.userData.attachment.offsetLocal.y,
      resolveKuoAVDobleHeightPlacement(alturaMm).surfaceBottomMm / 1000 - 0.0915);
    desk.position.x += 1;
    syncKuoAVPerimetralScreenAttachment(screen, desk);
    const expected = desk.localToWorld(new THREE.Vector3(
      0, screen.userData.attachment.offsetLocal.y, 0.203));
    assert.ok(screen.getWorldPosition(new THREE.Vector3()).distanceTo(expected) < 1e-8);
    parent.remove(desk);
  }
});
