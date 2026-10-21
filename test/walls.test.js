import test from 'node:test';
import assert from 'node:assert/strict';
import { createWallDefinition, getWallSegmentLength, normalizeWallDefinition, resizeWallSegment, updateWallDefinition, updateWallPoint } from '../src/core/architecture/walls/wallDefinition.js';
import { deserializeWalls, serializeWalls } from '../src/core/architecture/walls/wallPersistence.js';
import { deleteWallById, hitTestWall, selectWallAtPoint } from '../src/core/architecture/walls/wallInteraction2D.js';
import { buildWallGeometry2D, getWallBounds2D } from '../src/core/architecture/walls/wallGeometry2D.js';
import { buildWallGeometry3D } from '../src/core/architecture/walls/wallGeometry3D.js';
import { buildWallsGeometry3D } from '../src/core/architecture/walls/wallGeometry3D.js';
import { buildJoinedWallsGeometry2D, JOIN_EPSILON, WALL_JOIN_TYPES } from '../src/core/architecture/walls/wallJoins2D.js';
import { validateWallPointEdit } from '../src/core/architecture/walls/wallEditValidation.js';
import { createDoorDefinition } from '../src/core/architecture/openings/doorDefinition.js';

const legacyWall = {
  id: 'WALL_LEGACY',
  points: [{ x: 0, z: 0 }, { x: 3, z: 0 }],
  height: 2.4,
  thickness: 0.1,
};

test('normaliza muro legacy con defaults e IDs de punto', () => {
  const wall = normalizeWallDefinition(legacyWall);
  assert.equal(wall.schemaVersion, 1);
  assert.equal(wall.type, 'WALL');
  assert.equal(wall.baseElevation, 0);
  assert.equal(wall.alignment, 'CENTER');
  assert.equal(wall.joinStyle, 'MITER');
  assert.equal(wall.visible, true);
  assert.equal(wall.locked, false);
  assert.match(wall.points[0].id, /^WP_/);
});

test('mantiene IDs de puntos al actualizar', () => {
  const wall = createWallDefinition(legacyWall);
  const updated = updateWallDefinition(wall, {
    height: 3,
    points: wall.points.map(({ x, z }) => ({ x, z })),
  });
  assert.deepEqual(updated.points.map((point) => point.id), wall.points.map((point) => point.id));
  assert.equal(updated.height, 3);
});

test('normaliza escalares inválidos y rechaza menos de dos puntos válidos', () => {
  const wall = normalizeWallDefinition({ ...legacyWall, height: Number.NaN, thickness: -1, baseElevation: -2 });
  assert.equal(wall.height, 2.4);
  assert.equal(wall.thickness, 0.1);
  assert.equal(wall.baseElevation, 0);
  assert.equal(normalizeWallDefinition({ points: [{ x: 0, z: 0 }] }), null);
});

test('conserva elevación, visibilidad y bloqueo', () => {
  const wall = normalizeWallDefinition({ ...legacyWall, baseElevation: 0.9, height: 1.5, visible: false, locked: true });
  assert.equal(wall.baseElevation + wall.height, 2.4);
  assert.equal(wall.visible, false);
  assert.equal(wall.locked, true);
});

test('round-trip serializable conserva datos sin compartir referencias', () => {
  const wall = normalizeWallDefinition({ ...legacyWall, metadata: { source: 'test' } });
  const serialized = serializeWalls([wall]);
  const restored = deserializeWalls({ architecture: { walls: serialized } });
  assert.deepEqual(restored, serialized);
  assert.notEqual(restored[0], wall);
  assert.notEqual(restored[0].points, wall.points);
});

test('proyecto sin walls restaura colección vacía', () => {
  assert.deepEqual(deserializeWalls({ version: '1.0' }), []);
});

test('hit-test detecta muros horizontales, verticales y diagonales', () => {
  const walls = [
    normalizeWallDefinition({ ...legacyWall, id: 'HORIZONTAL' }),
    normalizeWallDefinition({ ...legacyWall, id: 'VERTICAL', points: [{ x: 5, z: 0 }, { x: 5, z: 3 }] }),
    normalizeWallDefinition({ ...legacyWall, id: 'DIAGONAL', points: [{ x: 10, z: 0 }, { x: 13, z: 3 }] }),
  ];
  assert.equal(hitTestWall({ x: 1, z: 0.04 }, walls, 0.01).wallId, 'HORIZONTAL');
  assert.equal(hitTestWall({ x: 5.04, z: 1 }, walls, 0.01).wallId, 'VERTICAL');
  assert.equal(hitTestWall({ x: 11, z: 1.04 }, walls, 0.01).wallId, 'DIAGONAL');
  assert.equal(hitTestWall({ x: 20, z: 20 }, walls, 0.01), null);
});

test('hit-test considera espesor y permite seleccionar un muro bloqueado', () => {
  const wall = normalizeWallDefinition({ ...legacyWall, thickness: 0.2, locked: true });
  assert.equal(selectWallAtPoint({ x: 1, z: 0.09 }, [wall]), wall.id);
});

test('un muro bloqueado no se edita ni elimina, pero puede desbloquearse', () => {
  const wall = normalizeWallDefinition({ ...legacyWall, locked: true });
  assert.equal(updateWallDefinition(wall, { height: 5 }).height, 2.4);
  assert.equal(deleteWallById([wall], wall.id).length, 1);
  assert.equal(updateWallDefinition(wall, { locked: false }).locked, false);
});

test('edición individual actualiza propiedades y persiste el resultado', () => {
  let wall = normalizeWallDefinition(legacyWall);
  wall = updateWallDefinition(wall, { height: 3, thickness: 0.2, baseElevation: 0.8, visible: false });
  const restored = deserializeWalls({ architecture: { walls: serializeWalls([wall]) } })[0];
  assert.equal(restored.height, 3);
  assert.equal(restored.thickness, 0.2);
  assert.equal(restored.baseElevation, 0.8);
  assert.equal(restored.visible, false);
});

test('delete elimina un muro no bloqueado', () => {
  const wall = normalizeWallDefinition(legacyWall);
  assert.deepEqual(deleteWallById([wall], wall.id), []);
});

test('geometría 2D horizontal respeta espesores 0.10 y 0.30', () => {
  const thin = buildWallGeometry2D(normalizeWallDefinition({ ...legacyWall, thickness: 0.1 }));
  const thick = buildWallGeometry2D(normalizeWallDefinition({ ...legacyWall, thickness: 0.3 }));
  assert.equal(thin.segmentsGeometry[0].length, 3);
  assert.equal(thin.bounds.depth, 0.1);
  assert.ok(Math.abs(thick.bounds.depth - 0.3) < 1e-12);
});

test('geometría 2D soporta segmentos verticales y diagonales', () => {
  const vertical = normalizeWallDefinition({ ...legacyWall, points: [{ x: 0, z: 0 }, { x: 0, z: 2 }] });
  const diagonal = normalizeWallDefinition({ ...legacyWall, points: [{ x: 0, z: 0 }, { x: 3, z: 4 }] });
  assert.equal(buildWallGeometry2D(vertical).segmentsGeometry[0].angle, Math.PI / 2);
  assert.equal(buildWallGeometry2D(diagonal).segmentsGeometry[0].length, 5);
});

test('polilínea genera segmentos con IDs estables y bounds reales', () => {
  const wall = normalizeWallDefinition({
    ...legacyWall,
    points: [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 2 }, { x: 4, z: 2 }],
    thickness: 0.2,
  });
  const first = buildWallGeometry2D(wall);
  const second = buildWallGeometry2D(wall);
  assert.equal(first.segmentsGeometry.length, 3);
  assert.deepEqual(
    first.segmentsGeometry.map((segment) => segment.segmentId),
    second.segmentsGeometry.map((segment) => segment.segmentId)
  );
  assert.deepEqual(getWallBounds2D(wall), first.bounds);
  assert.equal(first.bounds.minX, 0);
  assert.equal(first.bounds.maxX, 4);
  assert.equal(first.bounds.minZ, -0.1);
  assert.equal(first.bounds.maxZ, 2.1);
});

test('hit-test poligonal distingue interior y exterior', () => {
  const wall = normalizeWallDefinition({ ...legacyWall, thickness: 0.1 });
  assert.equal(hitTestWall({ x: 1, z: 0.04 }, [wall], 0)?.wallId, wall.id);
  assert.equal(hitTestWall({ x: 1, z: 0.06 }, [wall], 0), null);
});

test('descriptor 3D conserva longitud, rotación y baseElevation', () => {
  const wall = normalizeWallDefinition({
    ...legacyWall,
    points: [{ x: 1, z: 1 }, { x: 1, z: 4 }],
    height: 1.5,
    baseElevation: 0.9,
  });
  const segment = buildWallGeometry3D(wall).segmentsGeometry[0];
  assert.equal(segment.length, 3);
  assert.equal(segment.rotationY, Math.PI / 2);
  assert.equal(segment.center.y, 1.65);
  assert.equal(segment.baseElevation, 0.9);
});

test('descriptores 2D y 3D comparten longitud, centro y dirección', () => {
  const wall = normalizeWallDefinition({ ...legacyWall, points: [{ x: 1, z: 2 }, { x: 4, z: 6 }] });
  const segment2D = buildWallGeometry2D(wall).segmentsGeometry[0];
  const segment3D = buildWallGeometry3D(wall).segmentsGeometry[0];
  assert.equal(segment3D.segmentId, segment2D.segmentId);
  assert.equal(segment3D.length, segment2D.length);
  assert.equal(segment3D.center.x, segment2D.center.x);
  assert.equal(segment3D.center.z, segment2D.center.z);
  assert.equal(segment3D.rotationY, segment2D.angle);
});

function wallFrom(id, points, thickness = 0.1) {
  return normalizeWallDefinition({ id, points, height: 2.4, thickness });
}

function joinTypes(walls, options) {
  return buildJoinedWallsGeometry2D(walls, options).joins.map((join) => join.type);
}

test('clasifica continuidad recta sin esquina artificial', () => {
  const wall = wallFrom('STRAIGHT', [{ x: -2, z: 0 }, { x: 0, z: 0 }, { x: 2, z: 0 }]);
  assert.ok(joinTypes([wall]).includes(WALL_JOIN_TYPES.STRAIGHT));
});

test('resuelve ingletes L de 90 y 45 grados', () => {
  const rightAngle = wallFrom('L90', [{ x: -2, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 2 }]);
  const diagonal = wallFrom('L45', [{ x: -2, z: 0 }, { x: 0, z: 0 }, { x: 2, z: 2 }]);
  for (const wall of [rightAngle, diagonal]) {
    const result = buildJoinedWallsGeometry2D([wall]);
    assert.ok(result.joins.some((join) => join.type === WALL_JOIN_TYPES.L));
    const [first, second] = result.wallGeometries[0].segmentsGeometry;
    assert.deepEqual(first.polygon[2], second.polygon[3]);
    assert.deepEqual(first.polygon[1], second.polygon[0]);
  }
});

test('resuelve T ortogonal y recorta la rama contra el host', () => {
  const host = wallFrom('HOST', [{ x: -2, z: 0 }, { x: 2, z: 0 }]);
  const branch = wallFrom('BRANCH', [{ x: 0, z: 0 }, { x: 0, z: 2 }]);
  const joined = buildJoinedWallsGeometry2D([host, branch]);
  const join = joined.joins.find((candidate) => candidate.type === WALL_JOIN_TYPES.T);
  const branchSegment = joined.wallGeometries.find((geometry) => geometry.wallId === branch.id).segmentsGeometry[0];
  assert.ok(join);
  assert.equal(branchSegment.resolvedStart.z, 0.05);
  assert.ok(join.patch.length >= 3);
});

test('detecta T diagonal y espesores distintos', () => {
  const host = wallFrom('HOST_DIAGONAL', [{ x: -2, z: -2 }, { x: 2, z: 2 }], 0.3);
  const branch = wallFrom('BRANCH_DIAGONAL', [{ x: 0, z: 0 }, { x: -2, z: 2 }], 0.1);
  const joined = buildJoinedWallsGeometry2D([host, branch]);
  assert.ok(joined.joins.some((join) => join.type === WALL_JOIN_TYPES.T));
  assert.ok(joined.joins.find((join) => join.type === WALL_JOIN_TYPES.T).patch.length >= 3);
});

test('detecta cruces X ortogonales y diagonales', () => {
  const orthogonal = [
    wallFrom('X_H', [{ x: -2, z: 0 }, { x: 2, z: 0 }]),
    wallFrom('X_V', [{ x: 0, z: -2 }, { x: 0, z: 2 }]),
  ];
  const diagonal = [
    wallFrom('X_D1', [{ x: -2, z: -2 }, { x: 2, z: 2 }]),
    wallFrom('X_D2', [{ x: -2, z: 2 }, { x: 2, z: -2 }], 0.2),
  ];
  for (const walls of [orthogonal, diagonal]) {
    const joined = buildJoinedWallsGeometry2D(walls);
    const join = joined.joins.find((candidate) => candidate.type === WALL_JOIN_TYPES.X);
    assert.ok(join);
    assert.ok(join.patch.length >= 4);
  }
});

test('respeta tolerancia configurable entre muros separados', () => {
  const first = wallFrom('EPS_A', [{ x: -1, z: 0 }, { x: 0, z: 0 }]);
  const touching = wallFrom('EPS_B', [{ x: JOIN_EPSILON / 2, z: 0 }, { x: 1, z: 1 }]);
  const outside = wallFrom('EPS_C', [{ x: JOIN_EPSILON * 10, z: 0 }, { x: 1, z: 1 }]);
  assert.ok(joinTypes([first, touching]).includes(WALL_JOIN_TYPES.L));
  assert.ok(!joinTypes([first, outside]).includes(WALL_JOIN_TYPES.L));
});

test('polilínea zigzag resuelve varias esquinas sin mutar definición ni IDs', () => {
  const wall = wallFrom('ZIGZAG', [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 2 }, { x: 4, z: 2 }]);
  const before = JSON.stringify(wall);
  const first = buildJoinedWallsGeometry2D([wall]);
  const second = buildJoinedWallsGeometry2D([wall]);
  assert.equal(first.joins.filter((join) => join.type === WALL_JOIN_TYPES.L).length, 2);
  assert.deepEqual(
    first.wallGeometries[0].segmentsGeometry.map((segment) => segment.segmentId),
    second.wallGeometries[0].segmentsGeometry.map((segment) => segment.segmentId)
  );
  assert.equal(JSON.stringify(wall), before);
});

test('geometría 3D aplica el recorte T sin cambiar identidad lógica', () => {
  const host = wallFrom('HOST_3D', [{ x: -2, z: 0 }, { x: 2, z: 0 }], 0.2);
  const branch = wallFrom('BRANCH_3D', [{ x: 0, z: 0 }, { x: 0, z: 2 }], 0.1);
  const geometry = buildWallsGeometry3D([host, branch]);
  const branchSegment = geometry.segmentsGeometry.find((segment) => segment.wallId === branch.id);
  assert.equal(branchSegment.length, 1.9);
  assert.equal(branchSegment.segmentId, buildWallGeometry2D(branch).segmentsGeometry[0].segmentId);
});

test('largo horizontal 3 a 5 conserva inicio, dirección, IDs y actualiza 2D y 3D', () => {
  const wall = createWallDefinition({ id: 'LENGTH_H', points: [{ id: 'p1', x: 2, z: 3 }, { id: 'p2', x: 5, z: 3 }], height: 2.4, thickness: 0.15 });
  const resized = resizeWallSegment(wall, 0, 5);
  assert.deepEqual(resized.points, [{ id: 'p1', x: 2, z: 3 }, { id: 'p2', x: 7, z: 3 }]);
  assert.equal(getWallSegmentLength(resized), 5);
  assert.equal(buildWallGeometry2D(resized).segmentsGeometry[0].length, 5);
  const mesh = buildWallsGeometry3D([resized]).segmentsGeometry[0];
  assert.equal(mesh.length, 5);
  assert.equal(mesh.center.x, 4.5);
  assert.equal(mesh.height, 2.4);
  assert.equal(mesh.thickness, 0.15);
  assert.equal(wall.points[1].x, 5);
});

test('largos verticales, diagonales y decimales conservan orientación', () => {
  const vertical = createWallDefinition({ points: [{ x: 1, z: 1 }, { x: 1, z: 3 }] });
  const verticalNext = resizeWallSegment(vertical, 0, 2.75);
  assert.equal(verticalNext.points[1].x, 1);
  assert.equal(verticalNext.points[1].z, 3.75);
  const diagonal = createWallDefinition({ points: [{ x: 2, z: 3 }, { x: 4, z: 6 }] });
  const diagonalNext = resizeWallSegment(diagonal, 0, 5);
  assert.ok(Math.abs(getWallSegmentLength(diagonalNext) - 5) < 1e-12);
  assert.ok(Math.abs((diagonalNext.points[1].z - 3) / (diagonalNext.points[1].x - 2) - 1.5) < 1e-12);
  assert.equal(buildWallGeometry2D(diagonalNext).segmentsGeometry[0].angle, buildWallGeometry2D(diagonal).segmentsGeometry[0].angle);
});

test('rechaza longitudes y coordenadas inválidas sin cambiar el muro', () => {
  const wall = createWallDefinition({ points: [{ x: 0, z: 0 }, { x: 3, z: 0 }] });
  for (const length of [0, -1, NaN, Infinity, 'abc']) assert.equal(resizeWallSegment(wall, 0, length), null);
  assert.equal(updateWallPoint(wall, 1, { x: Infinity, z: 0 }), null);
  assert.equal(updateWallPoint(wall, 1, { x: 0, z: 0 }), null);
  assert.equal(getWallSegmentLength(wall), 3);
});

test('polilínea cambia solo el extremo compartido del segmento elegido', () => {
  const wall = createWallDefinition({ points: [
    { id: 'a', x: 0, z: 0 }, { id: 'b', x: 2, z: 0 },
    { id: 'c', x: 2, z: 2 }, { id: 'd', x: 4, z: 2 },
  ] });
  const resized = resizeWallSegment(wall, 1, 3);
  assert.deepEqual(resized.points.map((point) => point.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(resized.points.map(({ x, z }) => [x, z]), [[0, 0], [2, 0], [2, 3], [4, 2]]);
  assert.equal(getWallSegmentLength(resized, 1), 3);
  const moved = updateWallPoint(resized, 2, { x: 3, z: 3 });
  assert.equal(getWallSegmentLength(moved, 1), Math.sqrt(10));
  assert.equal(moved.points[3].x, 4);
});

test('round-trip legacy deriva largo y no persiste length', () => {
  const legacy = deserializeWalls({ architecture: { walls: [{ id: 'LEGACY_LENGTH', points: [{ x: 0, z: 0 }, { x: 3, z: 0 }] }] } })[0];
  const resized = resizeWallSegment(legacy, 0, 3.5);
  const serialized = serializeWalls([resized]);
  assert.equal(Object.hasOwn(serialized[0], 'length'), false);
  assert.equal(getWallSegmentLength(deserializeWalls({ architecture: { walls: serialized } })[0]), 3.5);
});

test('una abertura conserva segmentId y offset; se rechaza un acortamiento que la expulsa', () => {
  const wall = createWallDefinition({ id: 'WALL_WITH_DOOR', points: [
    { id: 'p1', x: 0, z: 0 }, { id: 'p2', x: 4, z: 0 },
  ] });
  const segmentId = buildWallGeometry2D(wall).segmentsGeometry[0].segmentId;
  const opening = createDoorDefinition({ wallId: wall.id, segmentId, offset: 2, width: 0.9, height: 2.1 });
  const longer = resizeWallSegment(wall, 0, 5);
  assert.equal(validateWallPointEdit(longer, [wall], [opening]).ok, true);
  assert.equal(buildWallGeometry2D(longer).segmentsGeometry[0].segmentId, segmentId);
  assert.equal(opening.offset, 2);
  const shorter = resizeWallSegment(wall, 0, 2);
  assert.equal(validateWallPointEdit(shorter, [wall], [opening]).ok, false);
  assert.equal(getWallSegmentLength(wall), 4);
});
