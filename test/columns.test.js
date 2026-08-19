import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COLUMN_SHAPES,
  createColumnDefinition,
  normalizeColumnDefinition,
  updateColumnDefinition,
} from '../src/core/architecture/columns/columnDefinition.js';
import { buildColumnGeometry2D } from '../src/core/architecture/columns/columnGeometry2D.js';
import { buildColumnGeometry3D } from '../src/core/architecture/columns/columnGeometry3D.js';
import { deleteColumnById, hitTestColumn } from '../src/core/architecture/columns/columnInteraction2D.js';
import { deserializeColumns, serializeColumns } from '../src/core/architecture/columns/columnPersistence.js';
import { generatePlanSvg } from '../src/utils/planExport.js';
import { generatePlanDxf } from '../src/utils/exportDXF.js';

const rectangle = () => createColumnDefinition({
  id: 'COLUMN_RECT', shape: COLUMN_SHAPES.RECTANGLE, position: { x: 1, z: 2 },
  width: 0.4, depth: 0.2, height: 2.4,
});
const circle = () => createColumnDefinition({
  id: 'COLUMN_CIRCLE', shape: COLUMN_SHAPES.CIRCLE, position: { x: -1, z: 1 },
  diameter: 0.5, height: 3,
});

test('normaliza columnas rectangular y circular', () => {
  assert.equal(rectangle().type, 'COLUMN');
  assert.equal(rectangle().shape, 'RECTANGLE');
  assert.equal(circle().shape, 'CIRCLE');
  assert.equal(rectangle().schemaVersion, 1);
});

test('normaliza dimensiones, posición y elevación inválidas', () => {
  const column = normalizeColumnDefinition({ width: -1, depth: 0, diameter: NaN, height: -2, baseElevation: -1, position: { x: Infinity, z: NaN } });
  assert.equal(column.width, 0.3);
  assert.equal(column.depth, 0.3);
  assert.equal(column.diameter, 0.3);
  assert.equal(column.height, 2.4);
  assert.equal(column.baseElevation, 0);
  assert.deepEqual(column.position, { x: 0, z: 0 });
});

test('geometría rectangular 2D conserva rotación y footprint real', () => {
  const column = updateColumnDefinition(rectangle(), { rotation: Math.PI / 2 });
  const geometry = buildColumnGeometry2D(column);
  assert.equal(geometry.polygon.length, 4);
  assert.ok(Math.abs(geometry.bounds.width - 0.2) < 1e-12);
  assert.ok(Math.abs(geometry.bounds.depth - 0.4) < 1e-12);
  assert.equal(geometry.corners.length, 4);
  assert.equal(geometry.midpoints.length, 4);
});

test('geometría circular mantiene radio y puntos cardinales', () => {
  const geometry = buildColumnGeometry2D(circle());
  assert.equal(geometry.radius, 0.25);
  assert.equal(geometry.cardinalPoints.length, 4);
  assert.equal(geometry.bounds.width, 0.5);
});

test('geometría 3D produce BOX y CYLINDER con elevación', () => {
  const box = buildColumnGeometry3D(updateColumnDefinition(rectangle(), { baseElevation: 0.8, height: 1.6 }));
  const cylinder = buildColumnGeometry3D(circle());
  assert.equal(box.geometryType, 'BOX');
  assert.equal(box.center.y, 1.6);
  assert.equal(cylinder.geometryType, 'CYLINDER');
  assert.equal(cylinder.diameter, 0.5);
});

test('hit-test detecta rectángulo rotado y círculo', () => {
  const rotated = updateColumnDefinition(rectangle(), { rotation: Math.PI / 4 });
  assert.equal(hitTestColumn({ x: 1, z: 2 }, [rotated])?.columnId, rotated.id);
  assert.equal(hitTestColumn({ x: -1, z: 1.2 }, [circle()])?.columnId, 'COLUMN_CIRCLE');
  assert.equal(hitTestColumn({ x: 10, z: 10 }, [rotated, circle()]), null);
});

test('locked permite consulta y desbloqueo pero impide editar y eliminar', () => {
  const locked = updateColumnDefinition(rectangle(), { locked: true });
  assert.equal(hitTestColumn({ x: 1, z: 2 }, [locked])?.columnId, locked.id);
  assert.equal(updateColumnDefinition(locked, { width: 2 }).width, 0.4);
  assert.equal(deleteColumnById([locked], locked.id).length, 1);
  assert.equal(updateColumnDefinition(locked, { locked: false }).locked, false);
});

test('visible false no participa en hit-test', () => {
  const hidden = updateColumnDefinition(rectangle(), { visible: false });
  assert.equal(hitTestColumn({ x: 1, z: 2 }, [hidden]), null);
});

test('delete elimina columna desbloqueada', () => {
  assert.deepEqual(deleteColumnById([rectangle()], 'COLUMN_RECT'), []);
});

test('persistencia y SAVE/LOAD conservan columna editada', () => {
  const edited = updateColumnDefinition(rectangle(), { position: { x: -2, z: 4 }, baseElevation: 0.5, rotation: 0.3 });
  const serialized = serializeColumns([edited]);
  const restored = deserializeColumns({ architecture: { columns: serialized } });
  assert.deepEqual(restored, serialized);
  assert.deepEqual(deserializeColumns({ version: '1.0' }), []);
});

test('SVG exporta rectángulo y círculo de columnas', () => {
  const svg = generatePlanSvg({ columns: [rectangle(), circle()] });
  assert.match(svg, /<polygon points=/);
  assert.match(svg, /<circle cx=/);
});

test('DXF exporta LWPOLYLINE y CIRCLE en capa de columnas', () => {
  const dxf = generatePlanDxf({ columns: [rectangle(), circle()] });
  assert.match(dxf, /COLUMNS/);
  assert.match(dxf, /LWPOLYLINE/);
  assert.match(dxf, /CIRCLE/);
});
