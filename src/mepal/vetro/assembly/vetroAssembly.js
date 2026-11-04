import { Group, Vector3, Quaternion } from 'three';
import { createVetroInstance } from '../factories/createVetroInstance.js';
import { applyVetroDoorState, normalizeVetroDoorState } from './vetroDoorArticulation.js';

export const VETRO_ASSEMBLY_KIND = 'VETRO_ASSEMBLY';

export function getVetroAssemblyRoot(object) {
  let current = object;
  while (current) {
    if (current.userData?.kind === VETRO_ASSEMBLY_KIND) return current;
    current = current.parent;
  }
  return null;
}

function doorVariant(object) {
  const variant = object?.userData?.config?.variant;
  if (object?.userData?.config?.productType === 'DOOR_FRAME')
    return variant?.startsWith('SINGLE_') ? 'SINGLE' : variant?.startsWith('DOUBLE_') ? 'DOUBLE' : null;
  return object?.userData?.config?.productType === 'DOOR_LEAF' ? variant : null;
}

export function createVetroDoorAssembly({ frame, leaf, floorStop = null, assemblyId = `vetro-assembly-${crypto.randomUUID()}`, parent, relationships } = {}) {
  if (frame?.userData?.kind !== 'VETRO_PRODUCT' || leaf?.userData?.kind !== 'VETRO_PRODUCT' ||
    frame.userData.config?.productType !== 'DOOR_FRAME' || leaf.userData.config?.productType !== 'DOOR_LEAF' ||
    !doorVariant(frame) || doorVariant(frame) !== doorVariant(leaf) ||
    getVetroAssemblyRoot(frame) || getVetroAssemblyRoot(leaf) || !parent || frame === leaf ||
    (floorStop && (floorStop.userData?.kind !== 'VETRO_PRODUCT' || floorStop.userData?.code !== '22013883' ||
      getVetroAssemblyRoot(floorStop) || floorStop === frame || floorStop === leaf)))
    return { success: false, reason: 'VETRO_DOOR_ASSEMBLY_MEMBERS_INVALID' };
  const root = new Group();
  root.name = VETRO_ASSEMBLY_KIND;
  root.position.copy(parent.worldToLocal(frame.getWorldPosition(new Vector3())));
  root.quaternion.copy(parent.getWorldQuaternion(new Quaternion()).invert().multiply(frame.getWorldQuaternion(new Quaternion())));
  root.userData = {
    kind: VETRO_ASSEMBLY_KIND, family: 'VETRO', line: 'VETRO', type: 'vetro-assembly',
    assemblyId, instanceId: assemblyId, assemblyType: 'DOOR', isPartRoot: true,
    excludeFromBOM: true, groupName: 'Armado puerta Vetro',
    members: [], relationships: relationships || [{ type: 'MARCO_NAVE', memberIds: [frame.userData.instanceId, leaf.userData.instanceId] }],
    externalConnections: [],
    doorState: normalizeVetroDoorState(),
  };
  parent.add(root);
  root.attach(frame);
  root.attach(leaf);
  if (floorStop) root.attach(floorStop);
  const members = [frame, leaf, floorStop].filter(Boolean);
  for (const member of members) {
    member.userData.vetroAssemblyId = assemblyId;
    member.userData.parentAssemblyId = assemblyId;
  }
  root.userData.members = members.map((member) => ({
    instanceId: member.userData.instanceId, sku: member.userData.code,
    productType: member.userData.config.productType,
    transform: { position: member.position.toArray(), quaternion: member.quaternion.toArray(), rotation: [member.rotation.x, member.rotation.y, member.rotation.z], scale: member.scale.toArray() },
  }));
  applyVetroDoorState(root);
  return { success: true, object: root };
}

export async function createVetroDoorAssemblyFromConfig(config, parent, transform) {
  const frameConfig = {
    category: 'DOORS', productType: 'DOOR_FRAME',
    variant: `${config.variant === 'DOUBLE' ? 'DOUBLE' : 'SINGLE'}_${config.doorFrameWithDuct ? 'WITH_DUCT' : 'WITHOUT_DUCT'}`,
    nominalHeightCm: config.nominalHeightCm,
    finish: config.doorFrameFinish || 'ANODIZED',
  };
  const [frameInstance, leafInstance, floorStopInstance] = await Promise.all([
    createVetroInstance({ config: frameConfig, transform }),
    createVetroInstance({ config, transform }),
    createVetroInstance({ config: { category: 'ACCESSORIES', productType: 'ACCESSORY', variant: 'DOOR_FLOOR_STOP_HALF_MOON' }, transform }),
  ]);
  if (!frameInstance.success || !leafInstance.success || !floorStopInstance.success)
    return { success: false, reason: 'VETRO_DOOR_MEMBERS_NOT_DOCUMENTED', frameInstance, leafInstance, floorStopInstance };
  parent.add(frameInstance.object, leafInstance.object, floorStopInstance.object);
  parent.updateMatrixWorld(true);
  const grouped = createVetroDoorAssembly({ frame: frameInstance.object, leaf: leafInstance.object, floorStop: floorStopInstance.object, parent });
  if (!grouped.success) {
    parent.remove(frameInstance.object, leafInstance.object, floorStopInstance.object);
    return grouped;
  }
  return { ...grouped, frameInstance, leafInstance, floorStopInstance };
}

export function detachVetroAssembly(root, parent = root?.parent) {
  if (root?.userData?.kind !== VETRO_ASSEMBLY_KIND || !parent) return false;
  for (const child of [...root.children]) {
    parent.attach(child);
    delete child.userData.vetroAssemblyId;
    delete child.userData.parentAssemblyId;
  }
  root.parent?.remove(root);
  return true;
}

export function restoreVetroAssembly(root, members, parent) {
  if (root?.userData?.kind !== VETRO_ASSEMBLY_KIND || !parent) return false;
  parent.add(root);
  for (const member of members) {
    root.attach(member);
    member.userData.vetroAssemblyId = root.userData.assemblyId;
    member.userData.parentAssemblyId = root.userData.assemblyId;
  }
  return true;
}

export async function createVetroAssemblyFromEntity(entity) {
  if (entity?.assemblyType !== 'DOOR' || !entity.assemblyId || ![2, 3].includes(entity.members?.length))
    return { success: false, reason: 'VETRO_ASSEMBLY_INVALID' };
  const instances = await Promise.all(entity.members.map((member) => createVetroInstance({
    config: member.config, instanceId: member.instanceId, transform: member.transform,
  })));
  if (instances.some((instance, index) => !instance.success || instance.object.userData.code !== entity.members[index].code ||
    entity.members[index].sku !== entity.members[index].code || instance.object.userData.config.productType !== entity.members[index].productType))
    return { success: false, reason: 'VETRO_ASSEMBLY_MEMBER_INVALID' };
  const frame = instances.find((instance) => instance.object.userData.config.productType === 'DOOR_FRAME')?.object;
  const leaf = instances.find((instance) => instance.object.userData.config.productType === 'DOOR_LEAF')?.object;
  const floorStops = instances.filter((instance) => instance.object.userData.code === '22013883');
  if (!frame || !leaf || doorVariant(frame) !== doorVariant(leaf) || floorStops.length !== entity.members.length - 2)
    return { success: false, reason: 'VETRO_ASSEMBLY_MEMBERS_INVALID' };
  const root = new Group();
  root.name = VETRO_ASSEMBLY_KIND;
  root.position.fromArray(entity.transform.position);
  root.quaternion.fromArray(entity.transform.quaternion);
  root.scale.fromArray(entity.transform.scale);
  root.userData = {
    kind: VETRO_ASSEMBLY_KIND, family: 'VETRO', line: 'VETRO', type: 'vetro-assembly',
    assemblyId: entity.assemblyId, instanceId: entity.assemblyId, assemblyType: 'DOOR',
    isPartRoot: true, excludeFromBOM: true, groupName: 'Armado puerta Vetro',
    members: entity.members.map((member) => ({ instanceId: member.instanceId, sku: member.code, productType: member.config.productType, transform: structuredClone(member.transform) })),
    relationships: structuredClone(entity.relationships || []),
    externalConnections: structuredClone(entity.externalConnections || []),
    doorState: normalizeVetroDoorState(entity.doorState),
  };
  for (const instance of instances) {
    instance.object.userData.vetroAssemblyId = entity.assemblyId;
    instance.object.userData.parentAssemblyId = entity.assemblyId;
    const savedMember = entity.members.find((member) => member.instanceId === instance.object.userData.instanceId);
    if (instance.object.userData.code === '22013883' && savedMember?.floorStopPlacement)
      instance.object.userData.floorStopPlacement = structuredClone(savedMember.floorStopPlacement);
    root.add(instance.object);
  }
  applyVetroDoorState(root);
  return { success: true, object: root, instances };
}
