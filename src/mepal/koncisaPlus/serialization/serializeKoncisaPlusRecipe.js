import * as THREE from 'three';

const SCHEMA_VERSION = 1;

const RUNTIME_KEYS = new Set([
  'uuid',
  'instanceId',
  'groupId',
  'groupName',
  'parentAssemblyId',
  'parentCostadoInstanceId',
  'object',
  'obj',
  'parent',
  'children',
]);

const LEADER_ROLE_KEYS = Object.freeze({
  MAIN: 'MAIN_SURFACE',
  RETURN: 'RETURN_SURFACE',
  MAIN_FREE_END: 'MAIN_COSTADO_FREE',
  MAIN_RETURN_JUNCTION: 'MAIN_RETURN_JUNCTION',
  RETURN_END: 'RETURN_COSTADO_END',
  MAIN_BEAM: 'MAIN_BEAM',
  CREDENZA: 'CREDENZA',
  CREDENZA_BEAM: 'CREDENZA_BEAM_DECORATION',
  MAIN_GROMMET: 'MAIN_GROMMET',
  RETURN_GROMMET: 'RETURN_GROMMET',
  MAIN_GROMMET_OUTLET_BOX: 'MAIN_GROMMET_OUTLET_BOX',
  RETURN_GROMMET_OUTLET_BOX: 'RETURN_GROMMET_OUTLET_BOX',
  MAIN_OUTLET_WALL_COUPLING: 'MAIN_OUTLET_WALL_COUPLING',
  RETURN_OUTLET_WALL_COUPLING: 'RETURN_OUTLET_WALL_COUPLING',
  COSTADO_OUTLET_WALL_COUPLING: 'COSTADO_OUTLET_WALL_COUPLING',
  MAIN_FLOOR_DUCT: 'MAIN_FLOOR_DUCT',
  RETURN_FLOOR_DUCT: 'RETURN_FLOOR_DUCT',
  MAIN_SKIRT: 'LEADER_SKIRT',
});

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toSerializable(value, seen = new WeakSet()) {
  if (value == null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item, seen)).filter((item) => item !== undefined);
  }
  if (typeof value !== 'object' || value.isObject3D || value.isMaterial || value.isBufferGeometry) {
    return undefined;
  }
  if (seen.has(value)) return undefined;
  seen.add(value);

  const output = {};
  Object.entries(value).forEach(([key, item]) => {
    if (RUNTIME_KEYS.has(key)) return;
    const serialized = toSerializable(item, seen);
    if (serialized !== undefined) output[key] = serialized;
  });
  seen.delete(value);
  return output;
}

function getObjectFromPart(part) {
  if (part?.obj?.isObject3D) return part.obj;
  if (part?.object?.isObject3D) return part.object;
  return part?.isObject3D ? part : null;
}

function getAssemblyIds(assembly) {
  return new Set(
    [
      assembly?.userData?.instanceId,
      assembly?.userData?.code,
      assembly?.userData?.codigoPT,
      assembly?.userData?.groupId,
    ].filter(Boolean)
  );
}

function isDescendantOf(object, ancestor) {
  let current = object?.parent || null;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent || null;
  }
  return false;
}

function belongsToAssembly(object, assembly, assemblyIds) {
  if (!object || object === assembly) return false;
  if (isDescendantOf(object, assembly)) return true;
  if (assemblyIds.has(object.userData?.parentAssemblyId)) return true;
  return Boolean(
    assembly?.userData?.groupId && object.userData?.groupId === assembly.userData.groupId
  );
}

function getMeta(object) {
  return object?.userData?.meta || {};
}

export function resolveComponentKey(object) {
  const userData = object?.userData || {};
  const meta = getMeta(object);
  const type = normalizeToken(userData.type || userData.kind);
  const subtype = normalizeToken(userData.subtype);
  const leaderRole = normalizeToken(meta.leaderRole || userData.leaderRole);

  if (type === 'LEADERCREDENZABEAMDECORATION' || type === 'LEADER_CREDENZA_BEAM_DECORATION') {
    return 'CREDENZA_BEAM_DECORATION';
  }
  if (LEADER_ROLE_KEYS[leaderRole]) return LEADER_ROLE_KEYS[leaderRole];

  if (leaderRole === 'SURFACE_JUNCTION') {
    const index = Number(meta.unionPlateIndex);
    return Number.isInteger(index) && index >= 0 ? `UNION_SUPPORT_${index + 1}` : null;
  }

  if (type === 'SURFACE' || type === 'SUPERFICIE') {
    const surfaceRole = normalizeToken(meta.surfaceRole || userData.surfaceRole);
    if (surfaceRole === 'MAIN') return 'MAIN_SURFACE';
    if (surfaceRole === 'RETURN') return 'RETURN_SURFACE';
  }

  if (type === 'COSTADO') {
    const replaceKey = normalizeToken(meta.replaceKey || userData.replaceKey);
    if (replaceKey.includes('MAIN_FREE_END')) return 'MAIN_COSTADO_FREE';
    if (replaceKey.includes('MAIN_RETURN')) return 'MAIN_RETURN_JUNCTION';
    if (replaceKey.includes('RETURN_END')) return 'RETURN_COSTADO_END';

    const moduleIndex = Number(meta.moduleIndex ?? userData.moduleIndex);
    const replaceZone = normalizeToken(meta.replaceZone || userData.replaceZone);
    if (Number.isInteger(moduleIndex) && replaceZone) {
      return `COSTADO_${moduleIndex}_${replaceZone}`;
    }
  }

  if (type === 'PEDESTAL' || normalizeToken(meta.category) === 'PEDESTALES') {
    const replaceKey = normalizeToken(meta.replaceKey || userData.replaceKey);
    const placementSide = normalizeToken(meta.placementSide);
    return replaceKey && placementSide ? `PEDESTAL_${replaceKey}_${placementSide}` : null;
  }

  if (meta.integrationSetId || userData.integrationSetId) {
    const integrationRole = normalizeToken(meta.integrationRole || subtype || type);
    const replaceZone = normalizeToken(meta.replaceZone || userData.replaceZone);
    return integrationRole && replaceZone ? `INTEGRATION_${replaceZone}_${integrationRole}` : null;
  }

  return null;
}

function getRelativeTransform(assembly, object) {
  assembly.updateMatrixWorld?.(true);
  object.updateMatrixWorld?.(true);

  const relativeMatrix = new THREE.Matrix4()
    .copy(assembly.matrixWorld)
    .invert()
    .multiply(object.matrixWorld);
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  relativeMatrix.decompose(position, quaternion, scale);

  return {
    position: position.toArray(),
    quaternion: quaternion.toArray(),
    scale: scale.toArray(),
  };
}

function getMeshPathKey(root, mesh) {
  const path = [];
  let current = mesh;
  while (current && current !== root) {
    const name = String(current.name || '').trim();
    const index = current.parent?.children?.indexOf(current) ?? -1;
    path.push(name ? `n:${name}` : `i:${index}`);
    current = current.parent || null;
  }
  return path.reverse().join('/');
}

function captureFinishes(object) {
  const userData = object.userData || {};
  const submeshes = toSerializable(userData.finishes || {}) || {};

  object.traverse?.((node) => {
    if (!node?.isMesh || !node.userData?.materialCode) return;
    const key = getMeshPathKey(object, node);
    if (!key) return;
    submeshes[key] = {
      ...(submeshes[key] || {}),
      materialCode: node.userData.materialCode,
    };
  });

  const output = {
    materialCode: userData.materialCode || null,
  };
  if (Object.keys(submeshes).length) output.submeshes = submeshes;
  return output;
}

function captureDimensions(object) {
  const userData = object.userData || {};
  return toSerializable({
    dim: userData.dim || null,
    dimM: userData.dimM || null,
    dimMm: userData.dimMm || null,
    billingDimMm: userData.billingDimMm || null,
    procedural: userData.procedural || null,
  });
}

function captureVariantSignals(component) {
  const metadata = component.metadata || {};
  const signals = {};
  Object.entries(metadata).forEach(([key, value]) => {
    if (
      /(replace|pedestal|integration|duct|cover|variant|accessor|addon|side|transformPatch)/i.test(
        key
      )
    ) {
      signals[key] = value;
    }
  });
  return signals;
}

function getConstructorKind(config, assembly) {
  const layoutType = normalizeToken(config?.layoutType || assembly?.userData?.layoutType);
  return layoutType === 'LEADER' ? 'KONCISA_PLUS_LEADER' : 'KONCISA_PLUS_STANDARD';
}

export function serializeKoncisaPlusRecipe({ assembly, physicalParts = [] } = {}) {
  if (!assembly?.isObject3D || assembly.userData?.kind !== 'KONCISA_PLUS_ASSEMBLY') {
    throw new TypeError('serializeKoncisaPlusRecipe requiere un assembly KONCISA_PLUS_ASSEMBLY.');
  }
  if (!Array.isArray(physicalParts)) {
    throw new TypeError('physicalParts debe ser un arreglo de objetos o registros de parts.');
  }

  const config = toSerializable(assembly.userData?.config || {}) || {};
  const assemblyIds = getAssemblyIds(assembly);
  const objects = Array.from(
    new Set(
      physicalParts
        .map(getObjectFromPart)
        .filter((object) => belongsToAssembly(object, assembly, assemblyIds))
    )
  );

  const components = objects.map((object) => {
    const userData = object.userData || {};
    const key = resolveComponentKey(object);
    const parentObject = objects.find((candidate) => candidate === object.parent) || null;
    const metadata = toSerializable(userData.meta || {}) || {};

    return {
      key,
      type: userData.type || null,
      kind: userData.kind || null,
      logicalCode: userData.logicalCode || null,
      codigoPT: userData.codigoPT || userData.code || null,
      model: toSerializable(userData.model || null) || null,
      dimensions: captureDimensions(object),
      transform: getRelativeTransform(assembly, object),
      metadata,
      relationship: {
        attachment: isDescendantOf(object, assembly) ? 'INTERNAL' : 'EXTERNAL',
        parentKey: parentObject ? resolveComponentKey(parentObject) : null,
      },
    };
  });

  const finishes = {};
  components.forEach((component, index) => {
    if (!component.key) return;
    const finish = captureFinishes(objects[index]);
    if (!finishes[component.key]) finishes[component.key] = finish;
  });

  const keyCounts = components.reduce((counts, component) => {
    if (component.key) counts[component.key] = (counts[component.key] || 0) + 1;
    return counts;
  }, {});
  const duplicatedComponentKeys = Object.entries(keyCounts)
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
  const missingComponentKeys = components
    .map((component, index) => (component.key ? null : index))
    .filter((index) => index != null);

  const replacements = [];
  const accessories = [];
  const overrides = [];
  components.forEach((component) => {
    const signals = captureVariantSignals(component);
    const category = normalizeToken(component.metadata?.category);
    const record = {
      componentKey: component.key,
      type: component.type,
      signals,
    };
    if (/PEDESTAL|INTEGRATION/.test(normalizeToken(component.type)) || signals.replaceKey) {
      replacements.push(record);
    } else if (/ACCESSOR|GROMMET|COUPLING|SUPPORT/.test(`${category}_${normalizeToken(component.type)}`)) {
      accessories.push(record);
    } else if (Object.keys(signals).length) {
      overrides.push(record);
    }
  });

  const warnings = [];
  if (missingComponentKeys.length) {
    warnings.push(`${missingComponentKeys.length} componente(s) no tienen una clave lógica estable.`);
  }
  if (duplicatedComponentKeys.length) {
    warnings.push(`Hay claves lógicas duplicadas: ${duplicatedComponentKeys.join(', ')}.`);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    constructorKind: getConstructorKind(config, assembly),
    product: {
      line: assembly.userData?.line || 'KONCISA.PLUS',
      layoutType: config.layoutType || assembly.userData?.layoutType || null,
    },
    config,
    components,
    finishes,
    variants: {
      replacements,
      accessories,
      overrides,
    },
    relationships: {
      components: components.map(({ key, relationship }) => ({ key, ...relationship })),
    },
    diagnostics: {
      componentCount: components.length,
      missingComponentKeys,
      duplicatedComponentKeys,
      warnings,
    },
  };
}
