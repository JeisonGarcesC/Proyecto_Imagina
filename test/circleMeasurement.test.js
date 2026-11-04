import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCircleArea,
  calculateCircleCircumference,
  containsCirclePoint,
  createAreaMeasurement,
  createCircleMeasurement,
  restoreAreaMeasurement,
  serializeAreaMeasurement,
  shouldSwitchAreaMethod,
} from '../src/plan2d/areaMeasurement.js';
import { circleCanvasGeometry, formatAreaDistance } from '../src/plan2d/areaMeasurementVisual.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';

const center = { x: 10.25, z: -3.5 };

test('circle keeps center and full precision radius, diameter, area and circumference', () => {
  const circle = createCircleMeasurement(center, 3, 'circle-3');
  assert.deepEqual(circle.center, center);
  assert.equal(circle.radius, 3);
  assert.equal(circle.radius * 2, 6);
  assert.equal(circle.area, 9 * Math.PI);
  assert.equal(circle.circumference, 6 * Math.PI);
  assert.equal(formatAreaDistance(circle.radius), '3,00 m');
});

test('small and large circles use the same formulas without rounding their stored values', () => {
  for (const radius of [0.35, 0.0001, 1000.125]) {
    const circle = createCircleMeasurement(center, radius, `circle-${radius}`);
    assert.equal(circle.area, calculateCircleArea(radius));
    assert.equal(circle.circumference, calculateCircleCircumference(radius));
  }
  assert.equal(formatAreaDistance(0.35), '35 cm');
  assert.equal(createCircleMeasurement(center, 0), null);
  assert.equal(createCircleMeasurement(center, -1), null);
});

test('screen zoom does not alter world radius or circle results', () => {
  const end = { x: center.x + 3, z: center.z };
  const expected = createCircleMeasurement(center, 3, 'expected');
  for (const zoom of [0.5, 1, 2, 4]) {
    const toScreen = (point) => ({ x: point.x * zoom * 80, z: point.z * zoom * 80 });
    const toWorld = (point) => ({ x: point.x / (zoom * 80), z: point.z / (zoom * 80) });
    const worldCenter = toWorld(toScreen(center));
    const worldEnd = toWorld(toScreen(end));
    const radius = Math.hypot(worldEnd.x - worldCenter.x, worldEnd.z - worldCenter.z);
    const circle = createCircleMeasurement(worldCenter, radius, 'expected');
    assert.equal(circle.radius, expected.radius);
    assert.equal(circle.area, expected.area);
    assert.equal(circle.circumference, expected.circumference);
  }
});

test('moving radius endpoint updates preview radius, area and circumference', () => {
  const radii = [1, 2, 3];
  const previews = radii.map((radius) => createCircleMeasurement(center, radius, 'preview'));
  assert.deepEqual(previews.map((circle) => circle.radius), radii);
  assert.ok(previews[0].area < previews[1].area && previews[1].area < previews[2].area);
  assert.ok(previews[0].circumference < previews[1].circumference && previews[1].circumference < previews[2].circumference);
});

test('circle hit testing uses world geometry', () => {
  const circle = createCircleMeasurement(center, 3, 'hit');
  assert.equal(containsCirclePoint(circle, { x: center.x + 2, z: center.z }), true);
  assert.equal(containsCirclePoint(circle, { x: center.x + 4, z: center.z }), false);
});

test('circle canvas geometry follows zoom while model values stay in world units', () => {
  const circle = createCircleMeasurement(center, 3, 'visual');
  for (const scale of [40, 80, 160]) {
    const geometry = circleCanvasGeometry(circle, (x, z) => [x * scale, z * scale], scale);
    assert.equal(geometry.radiusPx, 3 * scale);
    assert.equal(geometry.centerX, center.x * scale);
    assert.equal(geometry.centerY, center.z * scale);
    assert.equal(circle.area, 9 * Math.PI);
  }
});

test('switching polygon to circle and circle to polygon requires consent for a draft', () => {
  let confirmations = 0;
  const reject = () => { confirmations += 1; return false; };
  const accept = () => { confirmations += 1; return true; };
  assert.equal(shouldSwitchAreaMethod('POLYGON', 'CIRCLE', true, reject), false);
  assert.equal(shouldSwitchAreaMethod('POLYGON', 'CIRCLE', true, accept), true);
  assert.equal(shouldSwitchAreaMethod('CIRCLE', 'POLYGON', true, reject), false);
  assert.equal(shouldSwitchAreaMethod('CIRCLE', 'POLYGON', true, accept), true);
  assert.equal(shouldSwitchAreaMethod('CIRCLE', 'POLYGON', false, reject), true);
  assert.equal(confirmations, 4);
});

test('circle and polygon coexist; deleting one of two circles leaves the others', () => {
  const first = createCircleMeasurement(center, 1, 'first');
  const second = createCircleMeasurement({ x: 20, z: 0 }, 2, 'second');
  const polygon = createAreaMeasurement([{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 0, z: 2 }], 'polygon');
  const remaining = [first, second, polygon].filter((item) => item.id !== first.id);
  assert.deepEqual(remaining, [second, polygon]);
});

test('circle persistence stores center and radius and recalculates derived values', () => {
  const original = createCircleMeasurement(center, 3, 'persisted');
  const project = JSON.parse(JSON.stringify({ areaMeasurements: [serializeAreaMeasurement(original)] }));
  assert.deepEqual(project.areaMeasurements[0], { id: 'persisted', type: 'CIRCLE', center, radius: 3 });
  assert.deepEqual(restoreAreaMeasurement(project.areaMeasurements[0]), original);
});

test('circle creation and deletion replay with global Undo and Redo', async () => {
  const circle = createCircleMeasurement(center, 3, 'history-circle');
  let measurements = [circle];
  const history = createHistoryManager({ replayAction: (action, direction) => {
    const snapshot = direction === 'undo' ? action.before : action.after;
    measurements = measurements.filter((item) => item.id !== action.areaId);
    if (snapshot?.area) measurements.push(restoreAreaMeasurement(snapshot.area));
  } });
  history.pushAction({ type: HISTORY_ACTION_TYPES.CREATE_AREA_2D, areaId: circle.id, before: null, after: { area: circle } });
  await history.undo();
  assert.equal(measurements.length, 0);
  await history.redo();
  assert.deepEqual(measurements, [circle]);
  measurements = [];
  history.pushAction({ type: HISTORY_ACTION_TYPES.DELETE_AREA_2D, areaId: circle.id, before: { area: circle }, after: null });
  await history.undo();
  assert.deepEqual(measurements, [circle]);
  await history.redo();
  assert.equal(measurements.length, 0);
});
