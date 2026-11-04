import test from 'node:test';
import assert from 'node:assert/strict';
import { areaLabelPoint, containsAreaPoint, createAreaMeasurement, formatArea, isNearFirstAreaPoint, polygonAreaSquareMeters } from '../src/plan2d/areaMeasurement.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';
import { formatAreaSegmentDistance } from '../src/plan2d/areaMeasurementVisual.js';

const rectangle = [{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 3, z: 4 }, { x: 0, z: 4 }];

test('square, rectangle, triangle and concave polygon use their actual vertices', () => {
  assert.equal(polygonAreaSquareMeters([{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 2 }, { x: 0, z: 2 }]), 4);
  assert.equal(polygonAreaSquareMeters(rectangle), 12);
  assert.equal(polygonAreaSquareMeters([{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 0, z: 3 }]), 6);
  assert.equal(polygonAreaSquareMeters([{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 1 }, { x: 1, z: 1 }, { x: 1, z: 4 }, { x: 0, z: 4 }]), 7);
});

test('clockwise and counterclockwise polygons have the same positive area', () => {
  assert.equal(polygonAreaSquareMeters(rectangle), polygonAreaSquareMeters([...rectangle].reverse()));
});

test('area labels convert square meters to square millimeters', () => {
  assert.deepEqual(formatArea(12), { squareMeters: '12,00 m²', squareMillimeters: '12.000.000 mm²' });
});

test('world area does not change with screen zoom', () => {
  const area = polygonAreaSquareMeters(rectangle);
  for (const zoom of [0.5, 1, 2]) {
    const toScreen = (point) => ({ x: point.x * zoom * 100, z: point.z * zoom * 100 });
    const toWorld = (point) => ({ x: point.x / zoom / 100, z: point.z / zoom / 100 });
    assert.equal(polygonAreaSquareMeters(rectangle.map(toScreen).map(toWorld)), area);
  }
});

test('segment labels use world distance and compact units at every zoom', () => {
  const start = { x: 0, z: 0 };
  const end = { x: 1.8, z: 0 };
  assert.equal(formatAreaSegmentDistance(start, end), '1,80 m');
  assert.equal(formatAreaSegmentDistance(start, { x: 0.35, z: 0 }), '35 cm');
  for (const zoom of [0.5, 1, 2]) {
    const screenStart = { x: start.x * zoom * 100, z: start.z * zoom * 100 };
    const screenEnd = { x: end.x * zoom * 100, z: end.z * zoom * 100 };
    const toWorld = (point) => ({ x: point.x / (zoom * 100), z: point.z / (zoom * 100) });
    assert.equal(formatAreaSegmentDistance(toWorld(screenStart), toWorld(screenEnd)), '1,80 m');
  }
});

test('first point closes only with three or more points and within screen tolerance', () => {
  const toCanvas = (x, z) => [x * 100, z * 100];
  assert.equal(isNearFirstAreaPoint(rectangle.slice(0, 2), { x: 0, y: 0 }, toCanvas), false);
  assert.equal(isNearFirstAreaPoint(rectangle.slice(0, 3), { x: 8, y: 5 }, toCanvas), true);
  assert.equal(isNearFirstAreaPoint(rectangle, { x: 12, y: 0 }, toCanvas), false);
});

test('invalid polygons cannot be created', () => {
  assert.equal(createAreaMeasurement(rectangle.slice(0, 2)), null);
  assert.equal(createAreaMeasurement([{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0 }]), null);
});

test('area hit testing selects the polygon in world coordinates', () => {
  assert.equal(containsAreaPoint(rectangle, { x: 1, z: 1 }), true);
  assert.equal(containsAreaPoint(rectangle, { x: 5, z: 1 }), false);
  const concave = [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 1 }, { x: 1, z: 1 }, { x: 1, z: 4 }, { x: 0, z: 4 }];
  assert.equal(containsAreaPoint(concave, { x: 3, z: 3 }), false);
  assert.equal(containsAreaPoint(concave, areaLabelPoint(concave)), true);
});

test('two measurements remain independent and deleting one retains the other', () => {
  const first = createAreaMeasurement(rectangle, 'first');
  const second = createAreaMeasurement([{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 0, z: 2 }], 'second');
  const areas = [first, second].filter((area) => area.id !== 'first');
  assert.deepEqual(areas, [second]);
  assert.equal(first.area, 12);
  assert.equal(second.area, 2);
});

test('area data survives JSON project persistence and recalculates on load', () => {
  const source = createAreaMeasurement(rectangle, 'persisted');
  const project = JSON.parse(JSON.stringify({ areaMeasurements: [source] }));
  const restored = createAreaMeasurement(project.areaMeasurements[0].points, project.areaMeasurements[0].id);
  assert.deepEqual(restored, source);
});

test('global history replays area creation and deletion through undo and redo', async () => {
  const area = createAreaMeasurement(rectangle, 'history');
  let areas = [];
  const history = createHistoryManager({ replayAction: (action, direction) => {
    const snapshot = direction === 'undo' ? action.before : action.after;
    areas = areas.filter((item) => item.id !== action.areaId);
    if (snapshot?.area) areas.push(snapshot.area);
  } });
  areas.push(area);
  history.pushAction({ type: HISTORY_ACTION_TYPES.CREATE_AREA_2D, areaId: area.id, before: null, after: { area } });
  await history.undo();
  assert.equal(areas.length, 0);
  await history.redo();
  assert.deepEqual(areas, [area]);
  areas = [];
  history.pushAction({ type: HISTORY_ACTION_TYPES.DELETE_AREA_2D, areaId: area.id, before: { area }, after: null });
  await history.undo();
  assert.deepEqual(areas, [area]);
  await history.redo();
  assert.equal(areas.length, 0);
});
