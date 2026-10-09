import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildKuoAV } from '../src/mepal/kuoAV/builder/KuoAVBuilder.js';
import { buildKuoAVBOM, KUO_AV_BOM_CATALOG } from '../src/mepal/kuoAV/bom/kuoAVBOMCatalog.js';
import { buildKuoAVDoble } from '../src/mepal/kuoAVDoble/builder/KuoAVDobleBuilder.js';
import { createKuoAVDobleInstance } from '../src/mepal/kuoAVDoble/factory/createKuoAVDobleInstance.js';
import { createKuoAVInstance } from '../src/mepal/kuoAV/factory/createKuoAVInstance.js';
import { createKuoAVPantallaInstance } from '../src/mepal/kuoAV/factory/createKuoAVPantallaInstance.js';
import { resolveKuoAVPerimetralScreenHeight } from '../src/mepal/kuoAV/config/kuoAVPantallaPlacement.js';
import { resolveKuoAVInsertionX, KUO_AV_CONFIGURATION_GAP_M } from '../src/mepal/kuoAV/config/kuoAVInsertionPlacement.js';

test('pantalla doble usa ubicación central por defecto y no muestra selector de acabado', () => {
  const optionsSource = readFileSync(new URL('../src/components/KuoAVOptions.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(optionsSource, /Acabado de pantalla/);
  assert.doesNotMatch(optionsSource, /Ubicación de pantalla/);

  for (const pantallaTipo of ['FORMICA', 'VIDRIO', 'FRONTAL_PERIMETRAL']) {
    const built = buildKuoAVDoble({ pantalla: true, pantallaTipo, pantallaPosicion: 'POSTERIOR' });
    assert.equal(built.config.pantallaPosicion, 'CENTRAL');
    const screen = built.parts.find((part) => part.type === 'pantalla');
    assert.ok(screen);
    assert.equal(screen.position[2], pantallaTipo === 'FRONTAL_PERIMETRAL' ? 0.203 : 0);
  }
});

test('nuevas configuraciones KUO se separan por sus limites reales y el mismo lote sigue unido', () => {
  function desk(width, kind = 'KUO_AV_ASSEMBLY') {
    const object = new THREE.Group();
    object.userData.kind = kind;
    object.add(new THREE.Mesh(new THREE.BoxGeometry(width, 0.73, 1.2)));
    return object;
  }
  const first = desk(1.2);
  assert.equal(resolveKuoAVInsertionX([], first), 0);
  first.position.set(2, 0, -1);
  first.rotation.y = Math.PI / 3;
  const incoming = desk(1.65, 'KUO_AV_DOBLE_ASSEMBLY');
  incoming.children[0].position.x = -0.03;
  const existing = [first, first.children[0]];
  const beforePosition = first.position.clone();
  const beforeRotation = first.rotation.clone();
  incoming.position.x = resolveKuoAVInsertionX(existing, incoming);
  const firstBox = new THREE.Box3().setFromObject(first);
  const incomingBox = new THREE.Box3().setFromObject(incoming);
  assert.ok(Math.abs(incomingBox.min.x - firstBox.max.x - KUO_AV_CONFIGURATION_GAP_M) < 1e-9);
  assert.ok(first.position.equals(beforePosition));
  assert.ok(first.rotation.equals(beforeRotation));

  const sameBatch = desk(1.65, 'KUO_AV_DOBLE_ASSEMBLY');
  sameBatch.children[0].position.x = -0.03;
  sameBatch.position.x = incoming.position.x + 1.65;
  assert.ok(Math.abs(new THREE.Box3().setFromObject(sameBatch).min.x - incomingBox.max.x) < 1e-7);
  const next = desk(1.2);
  next.position.x = resolveKuoAVInsertionX([...existing, incoming, sameBatch], next);
  assert.ok(Math.abs(new THREE.Box3().setFromObject(next).min.x
    - new THREE.Box3().setFromObject(sameBatch).max.x - KUO_AV_CONFIGURATION_GAP_M) < 1e-9);
});

test('pantalla perimetral real apoya el soporte bajo la tapa y el vidrio junto al borde o al centro', async () => {
  const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
  const loader = new GLTFLoader();
  const loadGlb = async (candidates) => {
    const path = candidates.map((candidate) =>
      join(publicRoot, ...decodeURI(candidate).split('/').filter(Boolean))
    ).find((candidate) => existsSync(candidate));
    assert.ok(path, `GLB no disponible: ${candidates[0]}`);
    const buffer = readFileSync(path);
    return loader.parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '');
  };

  for (const anchoMm of [1200, 1500, 1650]) {
    for (const alturaMm of [730, 750]) {
      for (const isDouble of [false, true]) {
        const { object } = await (isDouble ? createKuoAVDobleInstance : createKuoAVInstance)({
          config: { anchoMm, alturaMm, thickMm: 30, pantalla: true, pantallaTipo: 'FRONTAL_PERIMETRAL' },
          loadGlb,
        });
        const surface = object.children.find((child) =>
          child.userData.role === (isDouble ? 'SURFACE_FRONT' : 'SURFACE')
        );
        const screen = object.children.find((child) => child.userData.role === 'PANTALLA');
        assert.ok(surface);
        assert.ok(screen);
        object.updateMatrixWorld(true);
        const surfaceBox = new THREE.Box3().setFromObject(surface);
        const screenBox = new THREE.Box3().setFromObject(screen);
        let glassBox = null;
        let supportTop = -Infinity;
        screen.traverse((child) => {
          if (!child.isMesh) return;
          const box = new THREE.Box3().setFromObject(child);
          if (box.max.y - box.min.y > 0.5 && box.max.z - box.min.z < 0.02) {
            glassBox = box;
          } else {
            supportTop = Math.max(supportTop, box.max.y);
          }
        });
        assert.ok(glassBox);
        assert.ok(Math.abs(supportTop - surfaceBox.min.y) < 0.0001, 'Soporte en contacto con la cara inferior');
        assert.ok(Math.abs(glassBox.max.z - (isDouble ? 0 : surfaceBox.min.z)) < 0.0001, 'Vidrio pegado al borde/centro');
        assert.ok(glassBox.max.y > surfaceBox.max.y + 0.5, 'Vidrio elevado sobre la tapa');
        assert.ok(Math.abs((screenBox.max.x + screenBox.min.x) / 2) < 0.01, 'Pantalla centrada en X');
        assert.ok(Math.abs((screenBox.max.x - screenBox.min.x) - (anchoMm / 1000 - 0.075)) < 0.01, 'Sin doble escalado');
      }
    }

    const { object } = await createKuoAVPantallaInstance({
      config: { tipo: 'FRONTAL_PERIMETRAL', anchoMm },
      loadGlb,
    });
    object.position.y = resolveKuoAVPerimetralScreenHeight();
    object.updateMatrixWorld(true);
    let glassBox = null;
    object.traverse((child) => {
      if (!child.isMesh) return;
      const box = new THREE.Box3().setFromObject(child);
      if (box.max.y - box.min.y > 0.5 && box.max.z - box.min.z < 0.02) glassBox = box;
    });
    assert.ok(glassBox);
    assert.ok(Math.abs(glassBox.max.z) < 0.0001, 'Pantalla independiente conserva el mismo plano de acople');
  }
});

test('perimetral reproduce las diez partidas y el total de la referencia gris pintada especial', () => {
  const bom = buildKuoAVBOM(buildKuoAV({
    anchoMm: 1200,
    profundidadMm: 600,
    thickMm: 30,
    espesorTipo: 'Formica 30',
    kitFuente: true,
    kitFuenteColor: 'Gris',
    acabadoGrommet: 'PAINTED',
    especial: true,
  }));
  assert.equal(bom.length, 10);
  assert.equal(bom.reduce((total, item) => total + item.qty * item.unitPrice, 0), 10467450);
  assert.deepEqual(bom.map((item) => item.code), [
    '22024327', '22000116690', '22000134911', '22000116523', '22000116338',
    '22000128023', '22000128083', '22000128084', '22000008989', '22000116693',
  ]);
  assert.ok(bom.every((item) => item.qty === 1));
  assert.match(bom.find((item) => item.type === 'superficie').description, /^SPECIAL:/);
});

test('el control unico del doble actualiza dos vertebras tanto en geometria como en BOM', () => {
  for (const enabled of [false, true]) {
    const built = buildKuoAVDoble({
      vertebraLateral: enabled,
      vertebraLeftEnabled: enabled,
      vertebraRightEnabled: enabled,
    });
    const quantity = enabled ? 2 : 0;
    assert.equal(built.parts.filter((part) => part.type === 'vertebra').length, quantity);
    assert.equal(built.bom.find((item) => item.type === 'vertebra')?.qty || 0, quantity);
    assert.equal(built.config.vertebraLateral, enabled);
  }
  const legacy = buildKuoAVDoble({ vertebraLeftEnabled: true, vertebraRightEnabled: false });
  assert.equal(legacy.bom.find((item) => item.type === 'vertebra').qty, 1);
  assert.equal(buildKuoAVDoble({}).bom.find((item) => item.type === 'vertebra').qty, 2);
});

test('doble usa los kits confirmados por color, sin precios cero ni descripciones blancas para gris/negro', () => {
  for (const [color, expected] of Object.entries(KUO_AV_BOM_CATALOG.powerKits)) {
    const built = buildKuoAVDoble({ kitFuenteColor: color });
    const kit = built.bom.find((item) => item.type === 'kit_fuente');
    assert.equal(kit.code, expected.code);
    assert.equal(kit.lookupTag, expected.lookupTag);
    assert.equal(kit.description, expected.description);
    assert.equal(kit.unitPrice, expected.price);
    assert.equal(kit.qty, 2);
  }
});

test('opciones del doble conservan material, altura, baldosa, costado, kit elevado y pantalla', () => {
  const built = buildKuoAVDoble({
    espesorTipo: 'Melamina 30',
    thickMm: 30,
    alturaMm: 750,
    baldosaFormica: true,
    costadoIntermedio: true,
    elevarKitFIzquierdo: true,
    pantalla: true,
    pantallaEnabled: true,
    pantallaTipo: 'FORMICA',
  });
  assert.equal(built.config.espesorTipo, 'Melamina 30');
  assert.equal(built.dimMm.height, 750);
  assert.equal(built.parts.filter((part) => part.type === 'superficie').length, 2);
  for (const key of ['baldosaFormica', 'costadoIntermedio', 'elevarKitFIzquierdo', 'pantalla']) {
    assert.equal(built.config[key], true, key);
  }
  assert.ok(built.parts.some((part) => part.codigo === 'KUBAL01'));
  assert.ok(built.parts.some((part) => part.type === 'pantalla'));
});

test('factory del doble carga los GLB reales y produce un ensamble visible con dos superficies e IDs fisicos', async () => {
  const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
  const loader = new GLTFLoader();
  const loadedPaths = [];
  const result = await createKuoAVDobleInstance({
    config: {
      instanceId: 'KUOAVD_OPTIONS_TEST',
      kitFuente: true,
      vertebraLateral: true,
    },
    loadGlb: async (candidates) => {
      const path = candidates.map((candidate) =>
        join(publicRoot, ...decodeURI(candidate).split('/').filter(Boolean))
      ).find((candidate) => existsSync(candidate));
      assert.ok(path, `GLB no disponible: ${candidates[0]}`);
      loadedPaths.push(path);
      const buffer = readFileSync(path);
      return loader.parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '');
    },
  });

  test('ambas factories aplican color del kit y acabado del grommet sin modificar el recurso original', async () => {
    const source = new THREE.Group();
    const sourceMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    source.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), sourceMaterial));
    for (const factory of [createKuoAVInstance, createKuoAVDobleInstance]) {
      for (const finish of ['ALUMINIUM', 'PAINTED']) {
        const { object } = await factory({
          config: { kitFuente: true, kitFuenteColor: 'Negro', acabadoGrommet: finish },
          loadGlb: async () => source,
        });
        const kit = object.children.find((child) =>
          child.userData.partType === 'kit_fuente' || child.userData.name?.startsWith('Paral Elevable')
        );
        const grommet = object.children.find((child) =>
          child.userData.partType === 'grommet' || child.userData.role === 'GROMMET_LEFT'
        );
        assert.ok(kit);
        assert.ok(grommet);
        assert.equal(kit.children[0].material.color.getHex(), 0x1e1e1e);
        assert.equal(grommet.children[0].material.metalness, finish === 'ALUMINIUM' ? 0.9 : 0.1);
        assert.notEqual(kit.children[0].material, sourceMaterial);
        assert.equal(sourceMaterial.color.getHex(), 0xffffff);
      }
    }
  });
  const { object } = result;
  assert.ok(loadedPaths.length > 10);
  assert.equal(object.children.filter((child) => child.userData.type === 'superficie').length, 2);
  assert.equal(object.children.filter((child) => child.userData.type === 'vertebra').length, 2);
  assert.equal(object.children.length, result.built.parts.filter((part) => part.modelKind !== 'logical').length);
  assert.equal(object.visible, true);
  assert.equal(object.position.y, 0);
  assert.equal(new Set(object.children.map((child) => child.userData.instanceId)).size, object.children.length);
  for (const child of object.children) {
    assert.equal(child.userData.parentAssemblyId, 'KUOAVD_OPTIONS_TEST');
    assert.equal(child.visible, true);
  }
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  assert.ok(size.x >= 1.19 && size.x < 2, `Ancho fuera de escala: ${size.x}`);
  assert.ok(size.z >= 1.2 && size.z < 2, `Profundidad fuera de escala: ${size.z}`);
  assert.ok(size.y >= 0.73 && size.y < 2, `Altura fuera de escala: ${size.y}`);
});
