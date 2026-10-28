import * as THREE from 'three';

const gltfNodeIndices = new WeakMap();

export function registerImportedGltfNodes(gltf) {
  for (const [object, association] of gltf?.parser?.associations ?? []) {
    const index = association?.nodes ?? (association?.type === 'nodes' ? association.index : null);
    if (Number.isInteger(index)) {
      gltfNodeIndices.set(object, index);
    }
  }
}

const vector = (value) => value.toArray().map((number) => Number(number.toFixed(3)));
const boxInfo = (box) => box.isEmpty() ? null : {
  min: vector(box.min), max: vector(box.max),
  size: vector(box.getSize(new THREE.Vector3())),
  center: vector(box.getCenter(new THREE.Vector3())),
};
const hash = (text) => {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  return (value >>> 0).toString(16).padStart(8, '0');
};

export function createImportedModelGroupInspector(importedRoot) {
  const gltfScene = importedRoot?.children?.[0];
  if (!gltfScene) return null;
  let gltfRoot = null;
  gltfScene.traverse((object) => {
    if (!gltfRoot && gltfNodeIndices.get(object) === 0) gltfRoot = object;
  });
  if (!gltfRoot) return null;
  importedRoot.updateMatrixWorld(true);
  const byId = new Map();
  const byObject = new WeakMap();
  const geometries = new Set(), materials = new Set(), textures = new Set();
  let meshCount = 0, triangleCount = 0, objectCount = 0;

  function inspect(object, depth = 0) {
    objectCount += 1;
    const id = gltfNodeIndices.get(object);
    const box = new THREE.Box3();
    const materialNames = new Set();
    let meshes = 0, triangles = 0;
    if (object.isMesh && object.geometry) {
      meshCount += 1;
      meshes = 1;
      geometries.add(object.geometry);
      const count = object.geometry.index?.count ?? object.geometry.getAttribute('position')?.count ?? 0;
      triangles = count / 3;
      triangleCount += triangles;
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      if (object.geometry.boundingBox) box.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!material) continue;
        materials.add(material);
        materialNames.add(material.name || '(sin nombre)');
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    }
    const children = [];
    for (const child of object.children) {
      const item = inspect(child, depth + 1);
      children.push(item);
      box.union(item.box);
      meshes += item.meshes;
      triangles += item.triangles;
      for (const name of item.materialNames) materialNames.add(name);
    }
    // El orden de exportación de los hijos cambia entre instancias equivalentes.
    const structureHash = hash(`${object.isMesh ? `M:${triangles}` : 'G'}|${children.map((child) => child.structureHash).sort().join(',')}`);
    const item = { id, object, name: object.name || '(sin nombre)', depth, box, meshes, triangles,
      materialNames, children, structureHash };
    byObject.set(object, item);
    if (Number.isInteger(id)) byId.set(id, item);
    return item;
  }
  const root = inspect(gltfRoot);
  const groups = root.children.filter((item) => Number.isInteger(item.id));
  const signature = (item) => [item.children.length, item.meshes, item.triangles,
    ...item.box.getSize(new THREE.Vector3()).toArray().map((value) => value.toFixed(3))].join('|');
  const repetitions = new Map();
  for (const item of groups) repetitions.set(signature(item), (repetitions.get(signature(item)) || 0) + 1);

  function summarize(item) {
    if (!item) return null;
    const size = item.box.getSize(new THREE.Vector3());
    const largestChild = item.children.filter((child) => !child.box.isEmpty())
      .sort((a, b) => b.box.getSize(new THREE.Vector3()).x * b.box.getSize(new THREE.Vector3()).z
        - a.box.getSize(new THREE.Vector3()).x * a.box.getSize(new THREE.Vector3()).z)[0];
    const largestSize = largestChild?.box.getSize(new THREE.Vector3());
    const candidateScore = (repetitions.get(signature(item)) || 1) >= 3 && item.meshes >= 20 &&
      Math.max(size.x, size.z) <= 10 ? 'Alto' : item.meshes >= 10 && Math.max(size.x, size.z) <= 20 ? 'Medio' : 'Bajo';
    return { id: item.id, name: item.name, depth: item.depth, meshes: item.meshes,
      triangles: item.triangles, childCount: item.children.length, bounds: boxInfo(item.box),
      materials: [...item.materialNames].sort(), childIds: item.children.map((child) => child.id).filter(Number.isInteger),
      signature: signature(item), structureHash: item.structureHash,
      repetitions: repetitions.get(signature(item)) || 1, candidateScore,
      largestChild: largestChild ? { id: largestChild.id, bounds: boxInfo(largestChild.box),
        horizontalPercent: size.x * size.z > 0 ? Number((largestSize.x * largestSize.z / (size.x * size.z) * 100).toFixed(1)) : 0 } : null,
      possibleExtensiveSurface: Boolean(largestSize && Math.max(largestSize.x, largestSize.z) > 50 &&
        largestSize.y < 0.25 && largestSize.x * largestSize.z > size.x * size.z * 0.5),
      transform: { position: vector(item.object.position), rotation: item.object.rotation.toArray().slice(0, 3).map((number) => Number(number.toFixed(3))),
        scale: vector(item.object.scale), matrix: item.object.matrix.toArray(), matrixWorld: item.object.matrixWorld.toArray() },
      path: `Scene / ${item.object.name === 'root' ? '0' : getPath(item)}` };
  }
  function getPath(item) {
    const ids = [];
    for (let current = item; current && current !== root; current = byObject.get(current.object.parent)) ids.unshift(current.id);
    return ids.join(' / ');
  }
  function ancestorsOf(object) {
    const ids = [];
    for (let current = object; current && current !== gltfRoot.parent; current = current.parent) {
      const id = gltfNodeIndices.get(current);
      if (Number.isInteger(id)) ids.push(id);
    }
    return ids;
  }
  const groupSummaries = groups.map(summarize);
  const groupsByStructure = new Map();
  for (const group of groupSummaries) {
    const members = groupsByStructure.get(group.structureHash) || [];
    members.push(group);
    groupsByStructure.set(group.structureHash, members);
  }
  const familyById = new Map();
  const families = [...groupsByStructure].map(([structureHash, members]) => {
    const variants = new Map();
    for (const member of members) variants.set(member.signature, (variants.get(member.signature) || 0) + 1);
    const positions = members.map((member) => ({
      id: member.id, center: member.bounds?.center || null, size: member.bounds?.size || null,
      signature: member.signature, possibleExtensiveSurface: member.possibleExtensiveSurface,
    }));
    for (const position of positions) {
      const others = positions.filter((other) => other !== position && other.center && position.center);
      position.nearestDistance = others.length ? Number(Math.min(...others.map((other) =>
        Math.hypot(position.center[0] - other.center[0], position.center[1] - other.center[1],
          position.center[2] - other.center[2]))).toFixed(3)) : null;
    }
    const family = { structureHash, count: members.length, memberIds: members.map((member) => member.id),
      variants: [...variants].map(([key, count]) => ({ signature: key, count })), positions };
    for (const member of members) familyById.set(member.id, family);
    return family;
  }).sort((first, second) => second.count - first.count);
  return {
    rootId: root.id,
    groups: groupSummaries,
    families,
    familyOf: (id) => familyById.get(Number(id)) || null,
    logicalCandidate: (id) => {
      const group = groupSummaries.find((item) => item.id === Number(id));
      if (!group) return null;
      return { groupId: group.id, signature: group.signature, structureHash: group.structureHash,
        center: group.bounds?.center, bounds: group.bounds, childNodeIds: group.childIds,
        meshCount: group.meshes, triangleCount: group.triangles,
        repetitionCount: group.repetitions, structuralConfidence: group.candidateScore,
        possibleExtensiveSurface: group.possibleExtensiveSurface };
    },
    totals: { objects: objectCount, meshes: meshCount, geometries: geometries.size,
      materials: materials.size, textures: textures.size, triangles: triangleCount },
    get: (id) => summarize(byId.get(Number(id))),
    object: (id) => byId.get(Number(id))?.object || null,
    children: (id) => byId.get(Number(id))?.children.map(summarize) || [],
    meshDescendants: (id, limit = 100) => {
      const target = byId.get(Number(id));
      if (!target) return [];
      const result = [], stack = [target];
      while (stack.length && result.length < limit) {
        const item = stack.pop();
        if (item.object.isMesh) result.push({ id: item.id, name: item.name, triangles: item.triangles });
        stack.push(...item.children);
      }
      return result;
    },
    compare: (firstId, secondId) => {
      const first = byId.get(Number(firstId)), second = byId.get(Number(secondId));
      if (!first || !second) return null;
      const counts = new Map();
      for (const child of first.children) counts.set(child.structureHash, (counts.get(child.structureHash) || 0) + 1);
      let shared = 0;
      for (const child of second.children) {
        const count = counts.get(child.structureHash) || 0;
        if (count) { shared++; counts.set(child.structureHash, count - 1); }
      }
      return { exactStructure: first.structureHash === second.structureHash,
        sharedDirectChildStructures: shared,
        directChildSimilarityPercent: first.children.length + second.children.length
          ? Number((200 * shared / (first.children.length + second.children.length)).toFixed(1)) : 100 };
    },
    ancestorsOf,
  };
}
