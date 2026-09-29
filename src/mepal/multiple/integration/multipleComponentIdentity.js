import { Quaternion, Vector3 } from 'three';
export const getMultipleComponentId = (rootId, key) => `${rootId}:component:${key}`;
export function initializeMultipleComponent(component, root) {
  const key = component.userData?.componentKey; const rootId = root.userData?.instanceId; if (!key || !rootId) return component;
  const id = getMultipleComponentId(rootId, key);
  Object.assign(component.userData, { kind: 'MULTIPLE_COMPONENT', componentId: id, instanceId: id, parentAssemblyId: rootId,
    groupId: root.userData.groupId, parametricOwner: 'MULTIPLE_PRODUCT', isPartRoot: true,
    parametricTransform: { position: component.position.toArray(), quaternion: component.quaternion.toArray(), scale: component.scale.toArray() } });
  component.traverse((node) => { if (node === component) return; Object.assign(node.userData, { componentId: id, componentKey: key,
    componentRole: component.userData.componentRole, parentAssemblyId: rootId, groupId: root.userData.groupId, parametricOwner: 'MULTIPLE_PRODUCT' });
    delete node.userData.instanceId; delete node.userData.isPartRoot; }); return component;
}
export function applyMultipleTransformOverride(component, transform) {
  if (!transform) return component; component.position.add(new Vector3().fromArray(transform.position || [0, 0, 0]));
  component.quaternion.multiply(new Quaternion().fromArray(transform.quaternion || [0, 0, 0, 1]));
  component.scale.multiply(new Vector3().fromArray(transform.scale || [1, 1, 1])); return component;
}
export function persistMultipleComponentTransforms(components = []) {
  for (const component of components) {
    if (component?.userData?.kind !== 'MULTIPLE_COMPONENT') continue; const root = component.parent;
    if (root?.userData?.kind !== 'MULTIPLE_PRODUCT') continue; const base = component.userData.parametricTransform;
    const baseQ = new Quaternion().fromArray(base.quaternion).normalize();
    const transformOverride = { position: component.position.clone().sub(new Vector3().fromArray(base.position)).toArray(),
      quaternion: baseQ.clone().invert().multiply(component.quaternion).normalize().toArray(),
      scale: component.scale.clone().divide(new Vector3().fromArray(base.scale)).toArray() };
    const key = component.userData.componentKey; root.userData.config = { ...root.userData.config,
      components: { ...(root.userData.config.components || {}), [key]: { ...(root.userData.config.components?.[key] || {}), transformOverride } } };
  }
}
export function syncMultipleRegistry(root, registry = []) {
  const id = root.userData.instanceId; for (let i = registry.length - 1; i >= 0; i--) if (registry[i]?.obj !== root && registry[i]?.obj?.userData?.parentAssemblyId === id) registry.splice(i, 1);
  for (const child of root.children) if (!registry.some((entry) => entry.obj === child)) registry.push({ code: child.userData.codigoPT, obj: child });
}
export function getMultipleRoot(object) { for (let node = object; node; node = node.parent) if (node.userData?.kind === 'MULTIPLE_PRODUCT') return node; return null; }
export function getMultipleComponent(object) { for (let node = object; node; node = node.parent) if (node.userData?.kind === 'MULTIPLE_COMPONENT') return node; return null; }
