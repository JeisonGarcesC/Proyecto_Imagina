// src/mepal/compendio/integration/compendioRegistration.js

export function registerCompendioInstance({ instance, parent, partsRegistry, pickables }) {
  const object = instance?.object;
  if (object?.userData?.kind !== 'COMPENDIO_PRODUCT') {
    throw new Error('COMPENDIO_PRODUCT_REQUIRED');
  }
  parent.add(object);
  if (!partsRegistry.some((p) => p.obj === object)) {
    partsRegistry.push({ code: object.userData.code, obj: object });
  }
  object.traverse((node) => {
    if (node !== object && node.userData?.isPartRoot) {
      if (!partsRegistry.some((p) => p.obj === node)) {
        partsRegistry.push({ code: node.userData.code, obj: node });
      }
    }
  });
  if (!pickables.includes(object)) {
    pickables.push(object);
  }
  return object;
}

export function getCompendioRoot(object) {
  for (let node = object; node; node = node.parent) {
    if (node.userData?.kind === 'COMPENDIO_PRODUCT') return node;
  }
  return null;
}

export function getCompendioSelectionInfo(object, node) {
  const component =
    object?.children?.find(
      (c) => c.userData?.componentKey && c.userData.componentKey === node?.userData?.componentKey
    ) || (node?.userData?.componentKey ? node : object);
  const d = component?.userData || {};
  return {
    code: d.codigoPT || d.code || object.userData?.code || null,
    description: d.description || object.userData?.description || 'Superficie Compendio',
    dimMm: d.dim || object.userData?.dim,
    materialBase: d.materialBase || 'FORMICA',
    componentRole: d.componentRole || 'SURFACE',
    componentKey: d.componentKey || 'surface-0',
    meta: d.meta || null,
    subName: d.componentKey ? d.description : null,
    config: object.userData?.config,
    kind: 'COMPENDIO_PRODUCT',
    line: 'COMPENDIO',
  };
}
