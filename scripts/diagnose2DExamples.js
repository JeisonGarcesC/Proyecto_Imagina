import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { createLinkInstance } from '../src/mepal/link/factories/createLinkInstance.js';
import { createVetroInstance } from '../src/mepal/vetro/factories/createVetroInstance.js';
import { diagnoseDetail2DInstance } from '../src/plan2d/diagnoseDetail2D.js';

const examples = [
  ['CRITERIUM 8', (await createCritterium8Instance({
    widthCm: 60, heightCm: 90, instanceId: 'DIAG_C8', frameId: 'DIAG_FRAME',
    tiles: [{ tileType: 'FORMICA', heightCm: 38 }],
  })).assembly],
  ['LINK', createLinkInstance({ config: {
    type: 'doble', hasDuct: true, cableAccess: 'grommet',
  } }).object],
  ['VETRO', (await createVetroInstance({ config: {
    category: 'DOORS', subcategory: 'DOOR_FRAME', productType: 'DOOR_FRAME',
    variant: 'SINGLE_WITHOUT_DUCT', nominalHeightCm: 204, finish: 'ANODIZED',
  } })).object],
  ['VETRO DOOR LEAF', (await createVetroInstance({ config: {
    productType: 'DOOR_LEAF', variant: 'SINGLE', nominalHeightCm: 204,
  } })).object],
];

for (const [family, root] of examples) {
  const report = diagnoseDetail2DInstance(root);
  const byIdentity = new Map();
  for (const row of report.rows) {
    const identity = row.partType || row.componentRole || row.meshName || '(unnamed)';
    const key = `${identity}|${row.reasons.join(',')}`;
    const item = byIdentity.get(key) || {
      identity, count: 0, projectable: 0, placeholder: 0, reasons: row.reasons,
    };
    item.count += 1;
    item.projectable += Number(row.geometryProjectable);
    item.placeholder += Number(row.placeholder);
    byIdentity.set(key, item);
  }
  console.log(JSON.stringify({ family, instanceId: report.instanceId,
    meshCount: report.rows.length, candidateShapeCount: report.candidateShapeCount,
    candidatePointCount: report.candidatePointCount, limitReasons: report.limitReasons,
    components: [...byIdentity.values()],
  }));
}
