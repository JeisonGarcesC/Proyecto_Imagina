import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createVetroInstance } from '../src/mepal/vetro/factories/createVetroInstance.js';
import { buildVetroProductKey, resolveVetroAsset } from '../src/mepal/vetro/renderers/vetroAssetResolver.js';
import { serializeVetroEntity } from '../src/core/persistence/entitySerializers.js';
import { loadPersistedEntity } from '../src/core/persistence/entityLoaders.js';

const config = {
  category: 'PANELS',
  productType: 'PANEL',
  material: 'TEMPERED_GLASS_10MM',
  nominalWidthCm: 60,
  nominalHeightCm: 204,
};

const product = {
  category: 'PANELS',
  productType: 'PANEL',
  material: 'TEMPERED_GLASS_10MM',
  dimensions: { nominalWidthCm: 60, nominalHeightCm: 204 },
  commercial: { reference: 'VTPN020000', variant: null },
  codeResolution: { supported: true, code: '22000009775' },
};

test('asset ausente conserva estado no disponible', () => {
  const result = resolveVetroAsset(product);
  assert.equal(result.available, false);
  assert.equal(result.diagnostic, 'VETRO_ASSET_NOT_AVAILABLE');
});

test('resuelve asset explicito por productKey', () => {
  const productKey = buildVetroProductKey(product);
  const result = resolveVetroAsset(product, { registry: [{
    id: 'panel-glass-60-204',
    productKey,
    assetPath: '/assets/models/Vetro/panel.glb',
    transform: { position: [1, 2, 3], rotation: [0, 1, 0], scale: [0.001, 0.001, 0.001] },
  }] });
  assert.equal(result.available, true);
  assert.equal(result.productKey, productKey);
  assert.equal(result.src, '/assets/models/Vetro/panel.glb');
  assert.deepEqual(result.transform.position, [1, 2, 3]);
});

test('resuelve asset explicito por codigo sin depender del nombre del archivo', () => {
  const result = resolveVetroAsset(product, { registry: [{
    id: 'opaque-name',
    code: '22000009775',
    assetPath: '/assets/models/Vetro/bloque-a.glb',
  }] });
  assert.equal(result.available, true);
  assert.equal(result.id, 'opaque-name');
});

test('fabrica carga visual, conserva materiales y aplica transform del asset', async () => {
  const material = new THREE.MeshStandardMaterial({ color: 0x123456 });
  const source = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 3), material);
  mesh.name = 'PANEL_GLASS';
  mesh.userData.originalMarker = 'kept';
  source.add(mesh);
  const result = await createVetroInstance({
    config,
    assetRegistry: [{
      id: 'panel',
      code: '22000009775',
      assetPath: '/assets/models/Vetro/panel.glb',
      units: 'mm',
      origin: 'documented-later',
      transform: { position: [0.1, 0.2, 0.3], rotation: [0, Math.PI / 2, 0], scale: [0.001, 0.001, 0.001] },
    }],
    loadAsset: async () => source,
  });
  assert.equal(result.success, true);
  assert.equal(result.object.userData.renderStatus, 'ASSET_AVAILABLE');
  assert.equal(result.object.userData.hasVisual, true);
  assert.equal(result.object.children.length, 1);
  assert.deepEqual(result.object.children[0].position.toArray(), [0.1, 0.2, 0.3]);
  assert.equal(mesh.material, material);
  assert.equal(mesh.userData.originalMarker, 'kept');
  assert.equal(mesh.userData.vetroProductCode, '22000009775');
});

test('persistencia reconstruye el producto y vuelve a resolver su asset', async () => {
  const registry = [{ id: 'panel', code: '22000009775', assetPath: '/assets/models/Vetro/panel.glb' }];
  const loadAsset = async () => new THREE.Group();
  const first = await createVetroInstance({ config, assetRegistry: registry, loadAsset });
  const entity = serializeVetroEntity(first.object);
  const restored = await loadPersistedEntity(entity, {
    createVetro: (saved) => createVetroInstance({
      config: saved.config,
      instanceId: saved.instanceId,
      transform: saved.transform,
      assetRegistry: registry,
      loadAsset,
    }).then((result) => result.object),
  });
  assert.equal(restored.userData.instanceId, entity.instanceId);
  assert.equal(restored.userData.renderStatus, 'ASSET_AVAILABLE');
  assert.equal(restored.userData.codigoPT, '22000009775');
});
