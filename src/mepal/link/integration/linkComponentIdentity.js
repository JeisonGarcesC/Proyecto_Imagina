import { Quaternion, Vector3 } from 'three';

const COMPONENT_KIND_BY_ROLE = Object.freeze({
  SURFACE: 'LINK_COMPONENT_SURFACE',
  SUPPORT: 'LINK_COMPONENT_SUPPORT',
  PEDESTAL: 'LINK_COMPONENT_PEDESTAL',
  GROMMET: 'LINK_COMPONENT_ACCESSORY',
  OUTLET_BOX: 'LINK_COMPONENT_ACCESSORY',
  UNION_PLATE: 'LINK_COMPONENT_ACCESSORY',
  FLOOR_DUCT: 'LINK_COMPONENT_ACCESSORY',
  CEILING_DUCT: 'LINK_COMPONENT_ACCESSORY',
  DUCT_COVER: 'LINK_COMPONENT_ACCESSORY',
  CREDENZA: 'LINK_COMPONENT_ACCESSORY',
  STRUCTURE: 'LINK_COMPONENT_STRUCTURE',
  DUCT: 'LINK_COMPONENT_DUCT',
});

const finiteArray = (value, length) =>
  Array.isArray(value) && value.length === length && value.every(Number.isFinite);

export function normalizeLinkComponentTransforms(value = {}) {
  const output = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return output;
  for (const [key, transform] of Object.entries(value)) {
    if (!key || !transform || typeof transform !== 'object') continue;
    const position = finiteArray(transform.position, 3) ? transform.position.map(Number) : [0, 0, 0];
    const quaternion = finiteArray(transform.quaternion, 4)
      ? new Quaternion(...transform.quaternion).normalize().toArray()
      : [0, 0, 0, 1];
    const scale = finiteArray(transform.scale, 3)
      ? transform.scale.map((component) => Number(component) || 1)
      : [1, 1, 1];
    output[key] = { position, quaternion, scale };
  }
  return output;
}

export function getLinkComponentId(rootInstanceId, componentKey) {
  return `${rootInstanceId}:component:${componentKey}`;
}

export function initializeLinkComponent(component, root, generation = 0) {
  const componentKey = component?.userData?.componentKey;
  const rootInstanceId = root?.userData?.instanceId;
  if (!componentKey || !rootInstanceId) return component;
  const componentId = getLinkComponentId(rootInstanceId, componentKey);
  const role = String(component.userData.componentRole || 'ACCESSORY').toUpperCase();
  Object.assign(component.userData, {
    kind: COMPONENT_KIND_BY_ROLE[role] || 'LINK_COMPONENT_ACCESSORY',
    componentEntityKind: 'LINK_COMPONENT',
    componentId,
    instanceId: componentId,
    parentAssemblyId: rootInstanceId,
    groupId: root.userData.groupId,
    parametricOwner: 'LINK_PRODUCT',
    isPartRoot: true,
    linkGeneration: generation,
    linkDisposed: false,
  });
  component.traverse((node) => {
    if (node === component) return;
    Object.assign(node.userData, {
      componentId,
      componentKey,
      componentRole: component.userData.componentRole,
      parentAssemblyId: rootInstanceId,
      groupId: root.userData.groupId,
      parametricOwner: 'LINK_PRODUCT',
      linkGeneration: generation,
    });
    delete node.userData.instanceId;
    delete node.userData.isPartRoot;
  });
  return component;
}

export function applyLinkComponentTransform(component, transform) {
  if (!component || !transform) return component;
  component.position.add(new Vector3().fromArray(transform.position || [0, 0, 0]));
  component.quaternion.multiply(new Quaternion().fromArray(transform.quaternion || [0, 0, 0, 1]));
  component.scale.multiply(new Vector3().fromArray(transform.scale || [1, 1, 1]));
  return component;
}

export function captureLinkComponentTransform(component) {
  const base = component?.userData?.parametricTransform;
  if (!component || !base) return null;
  const basePosition = new Vector3().fromArray(base.position);
  const baseQuaternion = new Quaternion().fromArray(base.quaternion).normalize();
  const baseScale = new Vector3().fromArray(base.scale);
  return {
    position: component.position.clone().sub(basePosition).toArray(),
    quaternion: baseQuaternion.clone().invert().multiply(component.quaternion).normalize().toArray(),
    scale: component.scale.clone().divide(baseScale).toArray(),
  };
}

export function persistLinkComponentTransforms(components = []) {
  const touchedRoots = new Set();
  for (const component of components) {
    if (component?.userData?.componentEntityKind !== 'LINK_COMPONENT') continue;
    const root = component.parent;
    if (root?.userData?.kind !== 'LINK_PRODUCT') continue;
    const transform = captureLinkComponentTransform(component);
    if (!transform) continue;
    root.userData.config = {
      ...root.userData.config,
      componentTransforms: {
        ...(root.userData.config?.componentTransforms || {}),
        [component.userData.componentKey]: transform,
      },
    };
    touchedRoots.add(root);
  }
  return [...touchedRoots];
}

export function syncLinkComponentRegistry(root, partsRegistry = []) {
  if (!root || !Array.isArray(partsRegistry)) return [];
  const rootId = root.userData?.instanceId;
  for (let index = partsRegistry.length - 1; index >= 0; index -= 1) {
    const object = partsRegistry[index]?.obj;
    if (object !== root && object?.userData?.parentAssemblyId === rootId && object?.userData?.parametricOwner === 'LINK_PRODUCT') {
      partsRegistry.splice(index, 1);
    }
  }
  for (const component of root.children) {
    if (component.userData?.componentEntityKind !== 'LINK_COMPONENT') continue;
    if (!partsRegistry.some((record) => record.obj === component)) {
      partsRegistry.push({ code: component.userData.codigoPT || null, obj: component });
    }
  }
  return root.children.filter((child) => child.userData?.componentEntityKind === 'LINK_COMPONENT');
}
