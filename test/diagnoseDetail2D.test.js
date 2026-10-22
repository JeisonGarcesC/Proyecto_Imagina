import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { diagnoseDetail2DInstance } from '../src/plan2d/diagnoseDetail2D.js';
import { extractDetailedFootprint2D, hasDetailedFootprint2DCacheEntry } from '../src/plan2d/extractDetailedFootprint2D.js';

test('diagnostic reports real mesh metadata and matches the unchanged detailed snapshot', () => {
  const root = new THREE.Group();
  root.userData = { kind: 'LOCKER_PRODUCT', instanceId: 'locker-1' };
  const component = new THREE.Group();
  component.userData = { componentRole: 'LOCKER_BAY', componentKey: 'bay-1' };
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.2));
  mesh.name = 'DOOR_PANEL';
  component.add(mesh);
  root.add(component);
  const footprint = { bounds: { w: 1, d: 0.2 } };
  const detail = extractDetailedFootprint2D(root, { normalShape: footprint });
  const before = JSON.stringify(detail);
  const report = diagnoseDetail2DInstance(root, { footprint, detailedFootprint: detail }, 3);
  assert.equal(report.rows[0].componentRole, 'LOCKER_BAY');
  assert.equal(report.rows[0].componentKey, 'bay-1');
  assert.equal(report.rows[0].inDetailedShapes, true);
  assert.equal(report.rows[0].detailedShapeIndex, 0);
  assert.equal(report.rows[0].snapshotIndex, 3);
  assert.equal(JSON.stringify(detail), before);
});

test('excluded product stays out of snapshot while its existing mesh is projectable', () => {
  const root = new THREE.Group();
  root.userData = { kind: 'LINK_PRODUCT' };
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.2));
  mesh.userData.componentRole = 'DUCT';
  root.add(mesh);
  assert.equal(hasDetailedFootprint2DCacheEntry(root), false);
  const report = diagnoseDetail2DInstance(root);
  assert.equal(report.rows[0].geometryProjectable, true);
  assert.equal(report.rows[0].inDetailedShapes, false);
  assert.ok(report.rows[0].reasons.includes('family_excluded'));
  assert.equal(hasDetailedFootprint2DCacheEntry(root), false);
});

test('diagnostic distinguishes hidden meshes and LineSegments', () => {
  const root = new THREE.Group();
  const hidden = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  hidden.visible = false;
  root.add(hidden);
  root.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1))));
  const report = diagnoseDetail2DInstance(root);
  assert.ok(report.rows[0].reasons.includes('invisible'));
  assert.ok(report.rows[1].reasons.includes('line_segments_not_supported'));
  assert.equal(report.rows[1].lineProjectionHasFiniteXZ, true);
  assert.ok(report.rows[1].lineProjectedBoundsArea > 0);
});
