import test from 'node:test';
import assert from 'node:assert/strict';
import { createWallDefinition, updateWallDefinition } from '../src/core/architecture/walls/wallDefinition.js';
import { buildWallGeometry2D } from '../src/core/architecture/walls/wallGeometry2D.js';
import { buildWallsGeometry3D } from '../src/core/architecture/walls/wallGeometry3D.js';
import {
  createDoorDefinition, DOOR_SWING_DIRECTIONS, DOOR_SWING_SIDES,
  updateDoorDefinition, validateDoorPlacement,
} from '../src/core/architecture/openings/doorDefinition.js';
import { buildDoorGeometry2D, buildWallSegmentPolygons2D, projectPointToWallSegment } from '../src/core/architecture/openings/doorGeometry2D.js';
import { deserializeOpenings, serializeOpenings } from '../src/core/architecture/openings/openingPersistence.js';
import { deleteOpeningsForWall, hitTestOpening } from '../src/core/architecture/openings/openingInteraction2D.js';
import { generatePlanSvg } from '../src/utils/planExport.js';
import { generatePlanDxf } from '../src/utils/exportDXF.js';

const makeWall = (id, points, overrides = {}) => createWallDefinition({ id, points, height: 2.4, thickness: 0.15, baseElevation: 0, ...overrides });
const horizontal = makeWall('WALL_H', [{ id: 'A', x: 0, z: 0 }, { id: 'B', x: 4, z: 0 }]);
const segmentId = buildWallGeometry2D(horizontal).segmentsGeometry[0].segmentId;
const door = (overrides = {}) => createDoorDefinition({ id: 'DOOR_A', wallId: horizontal.id, segmentId, offset: 2, width: 0.9, height: 2.1, ...overrides });

test('DoorDefinition conserva asociación estable y convención de offset al centro', () => {
  const item = door();
  assert.equal(item.wallId, 'WALL_H'); assert.equal(item.segmentId, segmentId); assert.equal(item.offset, 2);
  assert.equal(buildDoorGeometry2D(item, [horizontal], [item]).center.x, 2);
});

test('geometría funciona en muros horizontal, vertical y diagonal', () => {
  const walls = [horizontal, makeWall('WALL_V', [{ id: 'C', x: 0, z: 0 }, { id: 'D', x: 0, z: 4 }]), makeWall('WALL_D', [{ id: 'E', x: 0, z: 0 }, { id: 'F', x: 3, z: 4 }])];
  walls.forEach((wall) => {
    const segment = buildWallGeometry2D(wall).segmentsGeometry[0];
    const item = createDoorDefinition({ wallId: wall.id, segmentId: segment.segmentId, offset: segment.length / 2, width: 0.9, height: 2.1 });
    const geometry = buildDoorGeometry2D(item, walls, [item]);
    assert.equal(geometry.valid, true); assert.ok(Math.abs(Math.hypot(geometry.jambs[1].x - geometry.jambs[0].x, geometry.jambs[1].z - geometry.jambs[0].z) - 0.9) < 1e-9);
  });
});

test('proyección sobre segmento calcula offset longitudinal', () => {
  const segment = buildWallGeometry2D(horizontal).segmentsGeometry[0];
  assert.equal(projectPointToWallSegment({ x: 1.25, z: 0.2 }, segment).offset, 1.25);
});

test('LEFT/RIGHT e INSIDE/OUTSIDE cambian hoja y arco', () => {
  const variants = [
    door({ swingDirection: DOOR_SWING_DIRECTIONS.LEFT, swingSide: DOOR_SWING_SIDES.INSIDE }),
    door({ swingDirection: DOOR_SWING_DIRECTIONS.RIGHT, swingSide: DOOR_SWING_SIDES.INSIDE }),
    door({ swingDirection: DOOR_SWING_DIRECTIONS.LEFT, swingSide: DOOR_SWING_SIDES.OUTSIDE }),
  ].map((item) => buildDoorGeometry2D(item, [horizontal], [item]));
  assert.notDeepEqual(variants[0].hinge, variants[1].hinge);
  assert.notEqual(Math.sign(variants[0].openEnd.z), Math.sign(variants[2].openEnd.z));
  assert.equal(variants[0].arc.radius, 0.9);
});

test('rechaza puerta que no cabe, altura excesiva y solapamiento', () => {
  assert.equal(validateDoorPlacement(door({ offset: 0.2 }), [horizontal], []).reason, 'DOES_NOT_FIT');
  assert.equal(validateDoorPlacement(door({ height: 3 }), [horizontal], []).reason, 'HEIGHT_EXCEEDS_WALL');
  const first = door(); const second = door({ id: 'DOOR_B', offset: 2.4 });
  assert.equal(validateDoorPlacement(second, [horizontal], [first, second]).reason, 'OVERLAP');
});

test('permite dos puertas cuando sus intervalos no se solapan', () => {
  const first = door({ offset: 0.7, width: 0.8 }); const second = door({ id: 'DOOR_B', offset: 3.3, width: 0.8 });
  assert.equal(validateDoorPlacement(first, [horizontal], [first, second]).valid, true);
  assert.equal(validateDoorPlacement(second, [horizontal], [first, second]).valid, true);
});

test('edición valida offset y ancho, locked solo permite desbloquear', () => {
  const item = door();
  assert.equal(updateDoorDefinition(item, { offset: 0 }, { walls: [horizontal], openings: [item] }).offset, 2);
  const locked = createDoorDefinition({ ...item, locked: true });
  assert.equal(updateDoorDefinition(locked, { width: 2 }, { walls: [horizontal], openings: [locked] }).width, 0.9);
  assert.equal(updateDoorDefinition(locked, { locked: false }, { walls: [horizontal], openings: [locked] }).locked, false);
});

test('cambio de espesor actualiza símbolo y cambio de altura revalida', () => {
  const item = door();
  const thick = updateWallDefinition(horizontal, { thickness: 0.3 });
  assert.equal(buildDoorGeometry2D(item, [thick], [item]).thickness, 0.3);
  const low = updateWallDefinition(horizontal, { height: 2 });
  assert.equal(buildDoorGeometry2D(item, [low], [item]).valid, false);
});

test('recorte 2D produce dos polígonos sin mutar el muro', () => {
  const segment = buildWallGeometry2D(horizontal).segmentsGeometry[0];
  const pointsBefore = JSON.stringify(horizontal.points);
  const polygons = buildWallSegmentPolygons2D(segment, [door()]);
  assert.equal(polygons.length, 2); assert.equal(JSON.stringify(horizontal.points), pointsBefore);
});

test('recorte 3D crea laterales y dintel respetando elevación', () => {
  const elevated = updateWallDefinition(horizontal, { baseElevation: 0.8 });
  const item = door();
  const pieces = buildWallsGeometry3D([elevated], { openings: [item] }).segmentsGeometry;
  assert.equal(pieces.filter((piece) => piece.pieceKind === 'SIDE').length, 2);
  const lintel = pieces.find((piece) => piece.pieceKind === 'LINTEL');
  assert.ok(lintel); assert.ok(Math.abs(lintel.height - 0.3) < 1e-9); assert.ok(Math.abs(lintel.baseElevation - 2.9) < 1e-9);
});

test('persistencia y proyecto legacy conservan contrato declarativo', () => {
  const serialized = serializeOpenings([door()]);
  assert.deepEqual(deserializeOpenings({ architecture: { openings: serialized } }), serialized);
  assert.deepEqual(deserializeOpenings({ architecture: { walls: [] } }), []);
});

test('delete wall cascade elimina openings asociadas', () => {
  const other = door({ id: 'OTHER', wallId: 'OTHER_WALL' });
  assert.deepEqual(deleteOpeningsForWall([door(), other], horizontal.id).map((item) => item.id), ['OTHER']);
});

test('hit-test reconoce hoja, bisagra y hueco', () => {
  const item = door(); const geometry = buildDoorGeometry2D(item, [horizontal], [item]);
  assert.equal(hitTestOpening(geometry.hinge, [item], [horizontal], 0.05).openingId, item.id);
});

test('SVG y DXF exportan símbolo y layer DOORS', () => {
  const svg = generatePlanSvg({ walls: [horizontal], openings: [door()] });
  const dxf = generatePlanDxf({ walls: [horizontal], openings: [door()] });
  assert.match(svg, /class="door"/); assert.match(svg, / A /);
  assert.match(dxf, /DOORS/); assert.match(dxf, /ARC/);
});
