import { createMultipleInstance } from '../factories/createMultipleInstance.js';
import { validateMultipleCoreRules } from '../rules/core/multipleCoreRules.js';
import { MULTIPLE_COMMERCIAL_CATALOG } from '../catalog/multipleCommercialCatalog.generated.js';

export function serializeMultipleEntity(object) {
  const data = object.userData;
  const validation = validateMultipleCoreRules(data.config);
  if (!validation.valid) throw new Error(validation.diagnostics[0].code);
  const commercial = object.children.map((component) => ({ componentKey: component.userData.componentKey,
    codigoPT: component.userData.codigoPT || null, reference: component.userData.commercialReference || null,
    material: component.userData.commercialMaterial || component.userData.materialRole || null,
    finish: component.userData.commercialFinish || component.userData.finishId || null,
    price: component.userData.commercialPrice ?? null, currency: component.userData.commercialCurrency || null,
    status: component.userData.commercialStatus || 'PENDING' }));
  return { kind: 'MULTIPLE_PRODUCT', family: 'MULTIPLE', instanceId: data.instanceId, groupId: data.groupId,
    config: JSON.parse(JSON.stringify(data.config)), composition: JSON.parse(JSON.stringify(data.composition)),
    commercial,
    transform: { position: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray() } };
}

export function restoreMultipleEntity(entity) {
  if (!entity?.config) throw new Error('MULTIPLE_MISSING_CONFIG');
  const result = createMultipleInstance({ config: entity.config, instanceId: entity.instanceId, groupId: entity.groupId, transform: entity.transform });
  if (!result.success) throw new Error(result.reason);
  const current = new Map(result.object.children.map((component) => [component.userData.componentKey, component.userData]));
  const diagnostics = [];
  for (const previous of entity.commercial || []) {
    const next = current.get(previous.componentKey); if (!next) continue;
    if (previous.codigoPT && !MULTIPLE_COMMERCIAL_CATALOG.some((entry) => entry.codigoPT === previous.codigoPT)) diagnostics.push({ code: 'MULTIPLE_PREVIOUS_CODE_NOT_FOUND', level: 'INFO', componentKey: previous.componentKey, previous: previous.codigoPT });
    if (previous.codigoPT && next.codigoPT && previous.codigoPT !== next.codigoPT) diagnostics.push({ code: 'MULTIPLE_CODE_CHANGED', level: 'INFO', componentKey: previous.componentKey, previous: previous.codigoPT, current: next.codigoPT });
    if (previous.reference && next.commercialReference && previous.reference !== next.commercialReference) diagnostics.push({ code: 'MULTIPLE_REFERENCE_CHANGED', level: 'INFO', componentKey: previous.componentKey, previous: previous.reference, current: next.commercialReference });
    if (previous.price != null && next.commercialPrice != null && Number(previous.price) !== Number(next.commercialPrice)) diagnostics.push({ code: 'MULTIPLE_PRICE_CHANGED', level: 'INFO', componentKey: previous.componentKey, previous: previous.price, current: next.commercialPrice });
  }
  result.diagnostics = [...(result.diagnostics || []), ...diagnostics];
  result.object.userData.diagnostics = [...(result.object.userData.diagnostics || []), ...diagnostics];
  return result;
}
