import * as THREE from 'three';
import {
  DANCER_VERTEBRA,
  getDancerModel,
  getDancerModelSources,
  getDancerVertebraSources,
  normalizeDancerConfig,
} from './dancerCatalog.js';
import { resolveDancerCommercial } from './dancerCommercial.js';
import {
  applyDancerLength,
  placeDancerVertebra,
  resolveDancerLayout,
  resolveDancerVertebraAnchors,
} from './dancerGeometry.js';

function sceneOf(loaded) {
  return loaded?.scene || loaded?.object || loaded || null;
}

// Crea una mesa Dancer (mesa + vertebras opcionales) como un único objeto TekSocial.
// Reutiliza el contrato MEPAL_TEK_SOCIAL (BOM, selección, persistencia y clipboard).
export async function createDancerInstance({ config, country = 'CO', loadGlb } = {}) {
  if (typeof loadGlb !== 'function') {
    throw new TypeError('createDancerInstance requires loadGlb.');
  }

  const normalized = normalizeDancerConfig(config);
  const model = getDancerModel(normalized.planCode);

  const [commercial, tableLoaded] = await Promise.all([
    resolveDancerCommercial(normalized, country),
    loadGlb(getDancerModelSources(model, normalized.lengthCm)),
  ]);

  const table = sceneOf(tableLoaded);
  if (!table) throw new Error(`Unable to load Dancer table ${model.planCode}.`);

  const layout = resolveDancerLayout(table);

  // Las mesas con un GLB por largo (doble P y circular) no se alargan por geometría.
  if (model.shape === 'rectangular' && !model.glbByLength) {
    applyDancerLength(table, {
      targetLengthCm: normalized.lengthCm,
      nominalLengthCm: model.nominalLengthCm,
      layout,
    });
  }

  const root = new THREE.Group();
  root.add(table);

  if (normalized.vertebra) {
    const vertebraLoaded = await loadGlb(getDancerVertebraSources());
    const vertebra = sceneOf(vertebraLoaded);
    if (!vertebra) throw new Error(`Unable to load Dancer vertebra ${DANCER_VERTEBRA.planCode}.`);

    const anchors = resolveDancerVertebraAnchors(table, {
      layout,
      vertebraCount: model.vertebraCount,
    });
    anchors.forEach((anchor, index) => {
      const instance = index === 0 ? vertebra : vertebra.clone(true);
      const placed = placeDancerVertebra(instance, anchor);
      placed.name = `DANCER_VERTEBRA_${index + 1}`;
      root.add(placed);
    });
  }

  const planCode = model.planCode;
  const metadata = {
    kind: 'MEPAL_TEK_SOCIAL',
    family: 'MEPAL_TEK_SOCIAL',
    codigoPT: planCode,
    code: planCode,
    name: commercial.description,
    description: commercial.description,
    instanceId: root.uuid,
    tekSocialDancer: {
      planCode,
      lengthCm: normalized.lengthCm,
      vertebra: normalized.vertebra,
    },
    mepalTekSocialParts: commercial.parts,
    mepalTekSocialMeta: {
      descripcion: commercial.description,
      precio: Number(commercial.parts[0]?.unitPrice || 0),
      udm: 'und',
    },
  };

  root.userData = { ...(root.userData || {}), ...metadata };
  root.name = `MEPAL_TEK_SOCIAL_${planCode}`;

  return {
    object: root,
    metadata,
    commercial,
    partRecord: { code: planCode, obj: root },
  };
}
