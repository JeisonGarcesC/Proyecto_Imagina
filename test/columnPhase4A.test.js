import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createColumnDefinition, updateColumnDefinition } from '../src/core/architecture/columns/columnDefinition.js';
import { buildColumnGeometry2D } from '../src/core/architecture/columns/columnGeometry2D.js';
import { buildColumnGeometry3D } from '../src/core/architecture/columns/columnGeometry3D.js';
import { selectColumnAtPoint } from '../src/core/architecture/columns/columnInteraction2D.js';
import { serializeColumns, deserializeColumns } from '../src/core/architecture/columns/columnPersistence.js';
import { COLUMN_HISTORY_TYPES, createColumnHistoryAction, replayColumnHistoryAction } from '../src/core/architecture/columns/columnHistory.js';
import { createHistoryManager } from '../src/history/historyManager.js';

const rectangle = (id, x = 0, z = 0) => createColumnDefinition({
  id, shape: 'RECTANGLE', position: { x, z }, width: 0.4, depth: 0.2,
  rotation: Math.PI / 4, height: 2.7, baseElevation: 0.3,
});
const circle = (id, x = 0, z = 0) => createColumnDefinition({
  id, shape: 'CIRCLE', position: { x, z }, diameter: 0.3, rotation: Math.PI / 3,
});

function raycastColumn(columns, x, z) {
  const group = new THREE.Group();
  for (const column of columns) {
    if (column.visible === false) continue;
    const descriptor = buildColumnGeometry3D(column);
    const geometry = descriptor.geometryType === 'BOX'
      ? new THREE.BoxGeometry(descriptor.width, descriptor.height, descriptor.depth)
      : new THREE.CylinderGeometry(descriptor.diameter / 2, descriptor.diameter / 2, descriptor.height, 32);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    mesh.position.set(descriptor.center.x, descriptor.center.y, descriptor.center.z);
    mesh.rotation.y = descriptor.rotationY;
    mesh.userData.kind = 'COLUMN';
    mesh.userData.columnId = column.id;
    group.add(mesh);
  }
  group.updateMatrixWorld(true);
  const hits = new THREE.Raycaster(new THREE.Vector3(x, 6, z), new THREE.Vector3(0, -1, 0))
    .intersectObjects([group], true);
  group.traverse((object) => {
    if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); }
  });
  return hits[0]?.object?.userData || null;
}

test('raycast rectangular, circular y múltiple devuelve cada columnId sin wallId', () => {
  const columns = [rectangle('A', -2), circle('B', 0), rectangle('C', 2)];
  for (const [id, x] of [['A', -2], ['B', 0], ['C', 2]]) {
    const data = raycastColumn(columns, x, 0);
    assert.equal(data.kind, 'COLUMN');
    assert.equal(data.columnId, id);
    assert.equal(data.wallId, undefined);
  }
  assert.equal(raycastColumn(columns, 10, 0), null);
});

test('rotación física de rectángulo coincide en 2D y 3D sin cambiar el valor guardado', () => {
  for (const degrees of [15, 30, 45, 60, 90]) {
    const rotation = degrees * Math.PI / 180;
    const column = updateColumnDefinition(rectangle('A'), { rotation });
    const plan = buildColumnGeometry2D(column).polygon[2];
    const descriptor = buildColumnGeometry3D(column);
    const corner = new THREE.Vector3(column.width / 2, 0, column.depth / 2)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), descriptor.rotationY);
    assert.ok(Math.abs(corner.x - plan.x) < 1e-12, `${degrees}° X`);
    assert.ok(Math.abs(corner.z - plan.z) < 1e-12, `${degrees}° Z`);
    assert.equal(column.rotation, rotation);
  }
  assert.equal(buildColumnGeometry3D(circle('C')).geometryType, 'CYLINDER');
});

test('selección 2D, bloqueo, visibilidad y edición tras seleccionar conservan entidad', () => {
  const original = rectangle('A', 1, 2);
  assert.equal(selectColumnAtPoint({ x: 1, z: 2 }, [original]), 'A');
  assert.equal(raycastColumn([original], 1, 2).columnId, 'A');
  const selectedId = raycastColumn([original], 1, 2).columnId;
  const edited = updateColumnDefinition(original, {
    position: { x: 3, z: 4 }, width: 0.6, depth: 0.25,
    rotation: Math.PI / 6, height: 3.1, baseElevation: 0.5,
  });
  assert.equal(edited.id, selectedId);
  assert.equal(raycastColumn([edited], 3, 4).columnId, 'A');
  const locked = updateColumnDefinition(edited, { locked: true });
  assert.equal(raycastColumn([locked], 3, 4).columnId, 'A');
  assert.equal(updateColumnDefinition(locked, { width: 2 }).width, 0.6);
  const hidden = updateColumnDefinition(edited, { visible: false });
  assert.equal(raycastColumn([hidden], 3, 4), null);
  assert.equal(selectColumnAtPoint({ x: 3, z: 4 }, [hidden]), null);
  assert.equal(hidden.id, 'A');
});

test('rectángulo y círculo rotados persisten con contrato versión 1', () => {
  const columns = [rectangle('A', 1, 2), circle('B', -1, 3)];
  const saved = serializeColumns(columns);
  assert.deepEqual(deserializeColumns({ architecture: { columns: saved } }), saved);
  assert.deepEqual(saved.map(({ shape, rotation, position, height, baseElevation }) =>
    ({ shape, rotation, position, height, baseElevation })),
  columns.map(({ shape, rotation, position, height, baseElevation }) =>
    ({ shape, rotation, position, height, baseElevation })));
  assert.ok(saved.every((column) => column.schemaVersion === 1));
  assert.equal(JSON.stringify(saved).includes('history'), false);
});

test('historial global reproduce crear, editar posición/dimensiones, eliminar y múltiples acciones', async () => {
  let columns = [];
  const manager = createHistoryManager({ replayAction: (action, direction) => {
    columns = replayColumnHistoryAction(action, direction);
    return true;
  } });
  const commit = (type, next) => {
    const action = createColumnHistoryAction(type, columns, next);
    assert.ok(action);
    columns = next;
    manager.pushAction(action);
  };
  const a = rectangle('A');
  const b = circle('B', 2);
  const c = rectangle('C', 4);
  commit(COLUMN_HISTORY_TYPES.CREATE, [a]);
  assert.equal(columns.length, 1);
  await manager.undo();
  assert.deepEqual(columns, []);
  await manager.redo();
  assert.equal(columns[0].id, 'A');
  commit(COLUMN_HISTORY_TYPES.CREATE, [a, b]);
  commit(COLUMN_HISTORY_TYPES.CREATE, [a, b, c]);
  const edited = updateColumnDefinition(b, { position: { x: 3, z: 1 }, diameter: 0.5 });
  commit(COLUMN_HISTORY_TYPES.UPDATE, [a, edited, c]);
  commit(COLUMN_HISTORY_TYPES.DELETE, [a, edited]);
  await manager.undo();
  assert.deepEqual(columns.map((column) => column.id), ['A', 'B', 'C']);
  await manager.undo();
  assert.equal(columns[1].diameter, 0.3);
  assert.deepEqual(columns[1].position, { x: 2, z: 0 });
  await manager.redo();
  assert.equal(columns[1].diameter, 0.5);
  await manager.redo();
  assert.deepEqual(columns.map((column) => column.id), ['A', 'B']);
  assert.equal(createColumnHistoryAction(COLUMN_HISTORY_TYPES.UPDATE, columns, columns), null);
});
