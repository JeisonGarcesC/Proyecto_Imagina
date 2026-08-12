import assert from 'node:assert/strict';
import { loadDxfPlan } from '../src/core/plans/loaders/dxfPlanLoader.js';
import { parseDxfText } from '../src/core/plans/parsers/dxfPlanParser.js';
import { createDxfCalibration, resolveDxfUnitSelection } from '../src/core/plans/utils/dxfUnits.js';
import { createPlanDefinition } from '../src/core/plans/models/planDefinition.js';
import { deserializePlan, serializePlan } from '../src/core/plans/serialization/serializePlan.js';

function section(name, content) {
  return `0\nSECTION\n2\n${name}\n${content}0\nENDSEC\n`;
}

function document({ units = 4, blocks = '', entities = '' } = {}) {
  return [
    section('HEADER', `9\n$INSUNITS\n70\n${units}\n`),
    blocks ? section('BLOCKS', blocks) : '',
    section('ENTITIES', entities),
    '0\nEOF\n',
  ].join('');
}

async function load(text) {
  return loadDxfPlan(new Blob([text], { type: 'application/dxf' }));
}

const line = '0\nLINE\n5\n10\n8\n0\n10\n0\n20\n0\n11\n10\n21\n5\n';
const arc = '0\nARC\n5\n11\n8\n0\n10\n0\n20\n0\n40\n5\n50\n0\n51\n90\n';
const circle = '0\nCIRCLE\n5\n12\n8\n0\n10\n20\n20\n20\n40\n3\n';
const polyline =
  '0\nLWPOLYLINE\n5\n13\n8\n0\n90\n3\n70\n1\n10\n0\n20\n0\n42\n1\n10\n10\n20\n0\n42\n-0.5\n10\n10\n20\n10\n';
const text = '0\nTEXT\n5\n14\n8\nNOTES\n10\n2\n20\n3\n11\n8\n21\n9\n40\n2.5\n1\nTexto simple\n50\n30\n72\n1\n73\n2\n';
const mtext = '0\nMTEXT\n5\n15\n8\nNOTES\n10\n4\n20\n5\n40\n3\n1\nLinea 1\\PLinea 2\n50\n15\n71\n5\n';
const dimensionBlock =
  '0\nBLOCK\n2\n*D1\n3\n*D1\n8\n0\n10\n0\n20\n0\n70\n1\n' +
  '0\nTEXT\n8\nCV\n10\n78.4374\n20\n14.2677\n40\n0.15\n1\n2.30\n' +
  '0\nENDBLK\n';
const dimensionOverride =
  '0\nDIMENSION\n5\n40\n8\nCV\n2\n*D1\n10\n77.5749\n20\n14.2677\n' +
  '11\n78.4374\n21\n14.2677\n13\n77.5749\n23\n13.5577\n' +
  '14\n79.2999\n24\n13.5577\n70\n0\n42\n1.725\n1\n2.30\n50\n0\n';
const dimensionWithoutOverride =
  '0\nDIMENSION\n5\n41\n8\nCV\n10\n0\n20\n300\n11\n1150\n21\n300\n' +
  '13\n0\n23\n0\n14\n2300\n24\n0\n70\n0\n42\n2300\n50\n0\n';
const angularDimension =
  '0\nDIMENSION\n5\n42\n8\nCV\n10\n0\n20\n0\n13\n0\n23\n0\n14\n1\n24\n1\n70\n2\n';
const verticalDimension =
  '0\nDIMENSION\n5\n43\n8\nCV\n10\n2\n20\n0\n13\n0\n23\n0\n14\n0\n24\n10\n70\n0\n50\n90\n';
const alignedDimension =
  '0\nDIMENSION\n5\n44\n8\nCV\n10\n0\n20\n2\n13\n0\n23\n0\n14\n3\n24\n4\n70\n1\n';

const basic = await load(document({ entities: line + arc + circle + polyline + text + mtext }));
assert.equal(basic.vector.units.name, 'millimeters');
assert.equal(basic.calibration.metersPerDocumentUnit, 0.001);
assert.equal(basic.vector.statistics.lines, 1);
assert.equal(basic.vector.statistics.polylines, 1);
assert.equal(basic.vector.statistics.arcs, 1);
assert.equal(basic.vector.statistics.circles, 1);
assert.equal(basic.vector.statistics.texts, 2);
assert.ok(basic.vector.bounds.width > 0);
assert.equal(basic.vector.entities.find((entity) => entity.type === 'POLYLINE').geometry.closed, true);
assert.equal(
  basic.vector.entities
    .find((entity) => entity.type === 'POLYLINE')
    .geometry.segments.filter((segment) => segment.kind === 'ARC').length,
  2
);
const bulgeSegments = basic.vector.entities
  .find((entity) => entity.type === 'POLYLINE')
  .geometry.segments.filter((segment) => segment.kind === 'ARC');
assert.ok(bulgeSegments.some((segment) => segment.sweepAngle > 0));
assert.ok(bulgeSegments.some((segment) => segment.sweepAngle < 0));
const normalizedTexts = basic.vector.entities.filter((entity) => entity.type === 'TEXT');
assert.equal(normalizedTexts[0].geometry.sourceType, 'TEXT');
assert.equal(normalizedTexts[0].geometry.value, 'Texto simple');
assert.equal(normalizedTexts[0].geometry.height, 2.5);
assert.deepEqual(normalizedTexts[0].geometry.position, { x: 8, y: 9 });
assert.equal(normalizedTexts[1].geometry.sourceType, 'MTEXT');
assert.equal(normalizedTexts[1].geometry.value, 'Linea 1\nLinea 2');

const dimensions = await load(
  document({
    blocks: dimensionBlock,
    entities:
      dimensionOverride +
      dimensionWithoutOverride +
      verticalDimension +
      alignedDimension +
      angularDimension,
  })
);
assert.equal(dimensions.vector.statistics.dimensions, 4);
assert.equal(dimensions.vector.statistics.lines, 0);
assert.equal(dimensions.vector.diagnostics.ignoredDimensionTypes.ANGULAR, 1);
const normalizedDimensions = dimensions.vector.entities.filter(
  (entity) => entity.type === 'DIMENSION'
);
assert.equal(normalizedDimensions[0].geometry.dimensionType, 'HORIZONTAL');
assert.ok(Math.abs(normalizedDimensions[0].geometry.measuredValue - 1.725) < 1e-9);
assert.equal(normalizedDimensions[0].geometry.styledMeasurement, 1.725);
assert.equal(normalizedDimensions[0].geometry.textOverride, '2.30');
assert.equal(normalizedDimensions[0].geometry.displayText, '2.30');
assert.equal(normalizedDimensions[0].geometry.textHeight, 0.15);
assert.deepEqual(normalizedDimensions[0].geometry.textPosition, { x: 78.4374, y: 14.2677 });
assert.equal(normalizedDimensions[0].geometry.extensionLines.length, 2);
assert.equal(normalizedDimensions[0].geometry.dimensionLines.length, 1);
assert.equal(normalizedDimensions[0].geometry.arrows.length, 2);
assert.equal(normalizedDimensions[1].geometry.measuredValue, 2300);
assert.equal(normalizedDimensions[1].geometry.textOverride, null);
assert.equal(normalizedDimensions[1].geometry.displayText, '2300');
assert.equal(normalizedDimensions[2].geometry.dimensionType, 'VERTICAL');
assert.equal(normalizedDimensions[3].geometry.dimensionType, 'ALIGNED');
assert.equal(normalizedDimensions[3].geometry.measuredValue, 5);
assert.ok(dimensions.vector.bounds.maxY >= 300);

const block =
  '0\nBLOCK\n2\nCHAIR\n3\nCHAIR\n8\n0\n10\n0\n20\n0\n70\n0\n' +
  line +
  '0\nENDBLK\n';
const insert = '0\nINSERT\n5\n20\n8\n0\n2\nCHAIR\n10\n100\n20\n50\n41\n2\n42\n2\n50\n90\n';
const inserted = await load(document({ blocks: block, entities: insert }));
assert.equal(inserted.vector.statistics.blocks, 1);
assert.equal(inserted.vector.statistics.inserts, 1);
assert.equal(inserted.vector.entities.length, 1);
assert.deepEqual(inserted.vector.entities[0].geometry.start, { x: 100, y: 50 });
assert.ok(Math.abs(inserted.vector.entities[0].geometry.end.x - 90) < 1e-9);
assert.ok(Math.abs(inserted.vector.entities[0].geometry.end.y - 70) < 1e-9);

const unitless = await load(document({ units: 0, entities: line }));
assert.equal(unitless.vector.units.detected, false);
assert.equal(unitless.calibration.metersPerDocumentUnit, null);
assert.ok(unitless.diagnostics.warnings.some((warning) => warning.includes('INSUNITS')));

const expectedUnitScales = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048 };
for (const [unit, metersPerUnit] of Object.entries(expectedUnitScales)) {
  const selection = resolveDxfUnitSelection(unit);
  assert.equal(selection.metersPerUnit, metersPerUnit);
  assert.equal(selection.detected, false);
  assert.equal(selection.source, 'USER');
  assert.equal(1000 * selection.metersPerUnit, 1000 * metersPerUnit);
}
assert.equal(resolveDxfUnitSelection('invalid'), null);

const meters = await load(document({ units: 6, entities: line }));
assert.equal(meters.calibration.metersPerDocumentUnit, 1);
assert.equal(meters.calibration.originalMetersPerDocumentUnit, 1);
assert.equal(meters.calibration.source, 'DXF_INSUNITS');

const manualUnitCalibration = createDxfCalibration(resolveDxfUnitSelection('mm'));
assert.equal(manualUnitCalibration.metersPerDocumentUnit, 0.001);
assert.equal(manualUnitCalibration.originalMetersPerDocumentUnit, null);
assert.equal(manualUnitCalibration.source, 'MANUAL');

const recalibratedScale = 2 / 1000;
assert.equal(recalibratedScale, 0.002);
assert.ok(Math.abs(1.725 / 1725 - 0.001) < 1e-12);
assert.ok(Math.abs(2.3 / 1725 - 0.0013333333333333333) < 1e-12);
const persistedCalibration = {
  ...basic.calibration,
  metersPerDocumentUnit: recalibratedScale,
  originalMetersPerDocumentUnit: 0.001,
  sourceDistance: 1000,
  realDistanceMeters: 2,
  inputUnit: 'm',
  source: 'MANUAL',
  points: { a: { x: 0, y: 0 }, b: { x: 1000, y: 0 } },
};
const persistedPlan = deserializePlan(
  serializePlan(
    createPlanDefinition({
      sourceType: 'DXF',
      renderType: 'VECTOR',
      vector: basic.vector,
      calibration: persistedCalibration,
    })
  )
);
assert.deepEqual(persistedPlan.calibration, persistedCalibration);

const unsupported = await load(
  document({ entities: '0\nSPLINE\n5\n30\n8\n0\n70\n0\n71\n1\n72\n0\n73\n0\n74\n0\n' })
);
assert.equal(unsupported.diagnostics.ignoredByType.SPLINE, 1);

const circularBlock =
  '0\nBLOCK\n2\nLOOP\n3\nLOOP\n8\n0\n10\n0\n20\n0\n70\n0\n' +
  '0\nINSERT\n2\nLOOP\n10\n0\n20\n0\n' +
  '0\nENDBLK\n';
const circular = await load(
  document({
    blocks: circularBlock,
    entities: '0\nINSERT\n2\nLOOP\n10\n0\n20\n0\n',
  })
);
assert.ok(circular.diagnostics.warnings.some((warning) => warning.includes('referencia circular')));

assert.doesNotThrow(() => JSON.stringify(basic));
assert.ok(parseDxfText(document({ entities: line })).entities.length === 1);
await assert.rejects(
  () => loadDxfPlan(new Blob(['AutoCAD Binary DXF\r\n'], { type: 'application/dxf' })),
  /DXF binario/
);

console.log('DXF validation passed');
