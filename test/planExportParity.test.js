import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePlanSvg, exportSvgToPng, printSvgAsPdf } from '../src/utils/planExport.js';
import { resolvePlanDimensions2D, resolvePlanShapes2D } from '../src/plan2d/planRenderSnapshot2D.js';
import { createAreaMeasurement, createCircleMeasurement } from '../src/plan2d/areaMeasurement.js';
import { createShape } from '../src/plan2d/geometry2D/shapes2D.js';
import { createText2D } from '../src/plan2d/text2D/text2D.js';
import { createWallDefinition } from '../src/core/architecture/walls/wallDefinition.js';
import { buildWallGeometry2D } from '../src/core/architecture/walls/wallGeometry2D.js';
import { createDoorDefinition } from '../src/core/architecture/openings/doorDefinition.js';
import { areaSegmentLabelLayout, circleMeasurementLabels } from '../src/plan2d/areaMeasurementVisual.js';

test('snapshot compuesto conserva productos, muro, puerta, cota, área, círculo, texto y alzado', () => {
  const parts = [
    { id: 'PRODUCT_A', x: 0, z: 0, w: 1.2, d: 0.6, rotY: 0 },
    { id: 'PRODUCT_B', x: 3, z: 1, w: 0.8, d: 0.8, rotY: 0 },
  ];
  const wall = createWallDefinition({ id: 'WALL', points: [{ x: -1, z: -1 }, { x: 4, z: -1 }], height: 2.4, thickness: 0.15 });
  const segmentId = buildWallGeometry2D(wall).segmentsGeometry[0].segmentId;
  const door = createDoorDefinition({ id: 'DOOR', wallId: wall.id, segmentId, offset: 2, width: 0.9, height: 2.1 });
  const area = createAreaMeasurement([{ x: -2, z: 2 }, { x: 0, z: 2 }, { x: 0, z: 4 }, { x: -2, z: 4 }], 'AREA');
  const circle = createCircleMeasurement({ x: 5, z: 4 }, 0.8, 'CIRCLE');
  const elevation = createShape({ id: 'ELEVATION', type: 'elevation', viewDirection: 'front', label: 'A', sourceSelection: ['PRODUCT_A'], sourceBoxes: [
    { min: { x: 0, y: 0, z: 0 }, max: { x: 1.2, y: 0.7, z: 0.6 } },
    { min: { x: 0.2, y: 0.7, z: 0 }, max: { x: 1, y: 1, z: 0.6 } },
  ], geometry: { x: 7, y: 0 }, style: { stroke: '#111827', strokeWidth: 1 } });
  const text = createText2D({ id: 'TEXT', geometry: { x: 6, y: -2 }, text: 'Nota de usuario' });
  const rawDimension = { id: 'DIM', type: 'ALIGNED', startPoint: { x: -5, z: -5 }, endPoint: { x: 1.2, z: 0 }, value: 0, unit: 'm', offset: 20,
    references: { start: { sourceId: 'PRODUCT_A', sourceType: 'plant', feature: { kind: 'CENTER' } } }, label: '1.200 m' };
  const shapes2D = resolvePlanShapes2D([elevation]);
  const dimensions = resolvePlanDimensions2D(parts, shapes2D, [rawDimension]).dimensions;
  assert.deepEqual(dimensions[0].startPoint, { x: 0, z: 0 });
  assert.equal(dimensions[0].label, '1.200 m');
  assert.equal(shapes2D[0].geometry.components.length, 2);
  const svg = generatePlanSvg({ parts, walls: [wall], openings: [door], dimensions, areaMeasurements: [area, circle], shapes2D, texts2D: [text] });
  for (const fragment of ['class="door"', 'class="dimension"', '1.200 m', 'class="area-measurement"', 'elevation-details', 'Nota de usuario', 'Radio:', 'Circunferencia:']) {
    assert.ok(svg.includes(fragment), fragment);
  }
  assert.equal((svg.match(/class="elevation-details"/g) || []).length, 1);
  const elevationMarkup = svg.match(/<g class="elevation-details"[\s\S]*?<\/g>/)?.[0] || '';
  assert.equal((elevationMarkup.match(/<rect /g) || []).length, 2);
  assert.ok(!svg.includes('PRODUCT_A'));
});

test('mediciones comparten la posición y el formato de etiquetas con Canvas', () => {
  const layout = areaSegmentLabelLayout({ x: 0, z: 0 }, { x: 1.2, z: 0 }, (x, z) => [x * 140, -z * 140]);
  assert.equal(layout.label, '1,20 m');
  assert.equal(layout.x, 84);
  assert.equal(layout.y, 14);
  const circle = createCircleMeasurement({ x: 0, z: 0 }, 0.6);
  assert.equal(circleMeasurementLabels(circle).length, 4);
  assert.ok(circleMeasurementLabels(circle)[0].startsWith('Radio:'));
});

test('PNG y PDF usan el mismo SVG y conservan su relación ancho/alto', async () => {
  const svg = generatePlanSvg({ parts: [{ id: 'INTERNAL_123', x: 0, z: 0, w: 2, d: 1 }] });
  const original = { Image: globalThis.Image, document: globalThis.document, window: globalThis.window,
    createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL, setTimeout: globalThis.setTimeout };
  const urls = new Map();
  let printed = '';
  let canvasSize = null;
  try {
    URL.createObjectURL = (blob) => { const url = `blob:test:${urls.size}`; urls.set(url, blob); return url; };
    URL.revokeObjectURL = () => {};
    globalThis.Image = class { width = 200; height = 100; set src(_) { queueMicrotask(() => this.onload?.()); } };
    globalThis.document = { createElement: (tag) => tag === 'canvas'
      ? { width: 0, height: 0, getContext() { return { drawImage: () => { canvasSize = [this.width, this.height]; } }; }, toBlob: (done) => done(new Blob(['png'], { type: 'image/png' })) }
      : { click() {} } };
    globalThis.window = { open: () => ({ document: { open() {}, write(value) { printed = value; }, close() {} }, focus() {}, print() {} }) };
    globalThis.setTimeout = (callback) => { callback(); return 0; };
    await exportSvgToPng(svg, { scale: 2 });
    printSvgAsPdf(svg);
    const svgBlob = [...urls.values()].find((blob) => blob.type.startsWith('image/svg+xml'));
    assert.equal(await svgBlob.text(), svg);
    assert.ok(printed.includes(svg));
    assert.deepEqual(canvasSize, [400, 200]);
  } finally {
    globalThis.Image = original.Image;
    globalThis.document = original.document;
    globalThis.window = original.window;
    globalThis.setTimeout = original.setTimeout;
    URL.createObjectURL = original.createObjectURL;
    URL.revokeObjectURL = original.revokeObjectURL;
  }
});
