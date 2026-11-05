import test from 'node:test';
import assert from 'node:assert/strict';
import { boundsFromData, generatePlanSvg, get2DDisplayLabel } from '../src/utils/planExport.js';
import { createAreaMeasurement, createCircleMeasurement } from '../src/plan2d/areaMeasurement.js';

const internalId = '22000132392_1793826805200_4b941de8';
const part = { id: internalId, instanceId: internalId, groupId: 'KONCISA_123', x: 1, z: 2, w: 1, d: 0.6, rotY: 0 };

test('las identidades internas no son etiquetas visuales ni alteran el modelo', () => {
  const vetro = { ...part, id: 'VETRO_1', kind: 'VETRO_ASSEMBLY', assemblyId: 'VETRO_ASSEMBLY_ABC123', x: 4 };
  assert.equal(get2DDisplayLabel(part), '');
  assert.equal(get2DDisplayLabel({ ...part, displayLabel: internalId }), '');
  const before = structuredClone([part, vetro]);
  const svg = generatePlanSvg({ parts: [part, vetro] });
  assert.ok(!svg.includes(internalId));
  assert.ok(!svg.includes(vetro.assemblyId));
  assert.deepEqual([part, vetro], before);
});

test('cotas, áreas y círculos están en la misma exportación SVG', () => {
  const area = createAreaMeasurement([{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 2 }, { x: 0, z: 2 }], 'AREA_1');
  const circle = createCircleMeasurement({ x: 5, z: 3 }, 1, 'CIRCLE_1');
  const dimension = { id: 'DIM_1', type: 'ALIGNED', startPoint: { x: 0, z: 0 }, endPoint: { x: 2, z: 0 }, value: 2, unit: 'm', label: '2 m', offset: 20 };
  const svg = generatePlanSvg({ dimensions: [dimension], areaMeasurements: [area, circle] });
  assert.ok(svg.includes('class="dimension"'));
  assert.ok(svg.includes('2 m'));
  assert.ok(svg.includes('area-measurement'));
  assert.ok(svg.includes('Circunferencia:'));
  assert.ok(svg.includes('Diámetro:'));
  assert.ok(svg.includes('<polygon'));
  assert.ok(svg.includes('<circle'));
});

test('bounds incluyen el contenido 2D completo y el SVG usa ese encuadre', () => {
  const circle = createCircleMeasurement({ x: 10, z: 8 }, 2, 'CIRCLE_2');
  const shape = { type: 'line', geometry: { x1: -5, y1: -4, x2: -3, y2: -2 }, style: { stroke: '#000', strokeWidth: 1 } };
  const bounds = boundsFromData([part], [], [], [], [], [circle], [shape]);
  assert.ok(bounds.minX <= -5);
  assert.ok(bounds.minZ <= -4);
  assert.ok(bounds.maxX >= 12);
  assert.ok(bounds.maxZ >= 10);
  const svg = generatePlanSvg({ parts: [part], areaMeasurements: [circle], shapes2D: [shape] });
  const dimensions = svg.match(/<svg[^>]*width="(\d+)" height="(\d+)" viewBox="0 0 (\d+) (\d+)"/);
  assert.ok(dimensions);
  assert.equal(dimensions[1], dimensions[3]);
  assert.equal(dimensions[2], dimensions[4]);
  assert.ok(Number(dimensions[1]) > 17 * 140);
});

test('PNG y PDF reciben el mismo SVG generado a partir de un único snapshot', () => {
  const snapshot = { parts: [part], walls: [], columns: [], openings: [] };
  const svg = generatePlanSvg(snapshot);
  assert.equal(generatePlanSvg(snapshot), svg);
  assert.ok(svg.includes('viewBox="0 0'));
});
