import { serializeKoncisaPlusRecipe } from '../../mepal/koncisaPlus/serialization/serializeKoncisaPlusRecipe.js';

export const PROJECT_SCHEMA_VERSION = 2;

const SUPPORTED_KINDS = new Set([
  'SURFACE',
  'PART',
  'CATALOG_PRODUCT',
  'TYPOLOGY',
  'CLAK',
  'EDUK',
  'ARES',
  'MEPAL_SALUD',
  'MEPAL_TEK_SOCIAL',
  'ALMACENAMIENTO',
  'OFFICE_ACCESSORY',
]);

const METADATA_FIELDS = {
  SURFACE: ['line', 'dim', 'procedural', 'generico'],
  PART: ['generico'],
  CATALOG_PRODUCT: ['family', 'legacyKind', 'generico'],
  TYPOLOGY: [],
  CLAK: ['clakVariant'],
  EDUK: ['edukVariant', 'edukSelection', 'edukHeight', 'edukWidth'],
  ARES: [],
  MEPAL_SALUD: ['mepalVariant'],
  MEPAL_TEK_SOCIAL: [],
  ALMACENAMIENTO: [
    'legacyKind',
    'family',
    'almacenVariant',
    'almacenCategory',
    'almacenVariants',
  ],
  OFFICE_ACCESSORY: ['accessoryName'],
};

function cloneSerializable(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

export function isKoncisaPersistenceObject(object) {
  const data = object?.userData || {};
  const discriminator = `${data.kind || ''} ${data.type || ''} ${data.family || ''} ${
    data.parentAssemblyId || ''
  } ${data.groupId || ''} ${data.groupName || ''}`.toUpperCase();
  return discriminator.includes('KONCISA');
}

function findKoncisaAssembly(object) {
  let current = object || null;
  while (current) {
    if (current.userData?.kind === 'KONCISA_PLUS_ASSEMBLY') return current;
    current = current.parent || null;
  }
  return null;
}

function serializeKoncisaAssembly(assembly, physicalParts) {
  const recipe = serializeKoncisaPlusRecipe({ assembly, physicalParts });
  const data = assembly.userData || {};
  const assemblyId = data.instanceId || data.code || assembly.uuid;
  const groupId = data.groupId || assemblyId;

  return {
    kind: 'KONCISA_PLUS',
    instanceId: assemblyId,
    assemblyId,
    groupId,
    family: 'KONCISA_PLUS',
    codigoPT: data.codigoPT || groupId,
    code: data.code || groupId,
    transform: {
      position: assembly.position.toArray(),
      quaternion: assembly.quaternion.toArray(),
      rotation: [assembly.rotation.x, assembly.rotation.y, assembly.rotation.z],
      scale: assembly.scale.toArray(),
    },
    materialBase: null,
    materialCode: null,
    finishes: recipe.finishes,
    config: recipe.config,
    recipe,
    metadata: {
      line: data.line || 'KONCISA.PLUS',
      layoutType: recipe.product?.layoutType || data.layoutType || null,
      constructorKind: recipe.constructorKind,
      groupName: data.groupName || data.name || 'Koncisa Plus',
    },
  };
}

function resolvePersistentKind(object) {
  const kind = String(object?.userData?.kind || 'PART').trim().toUpperCase();
  return SUPPORTED_KINDS.has(kind) ? kind : 'PART';
}

function pickMetadata(object, kind) {
  const data = object?.userData || {};
  return Object.fromEntries(
    (METADATA_FIELDS[kind] || [])
      .filter((key) => data[key] !== undefined)
      .map((key) => [key, cloneSerializable(data[key])])
  );
}

export function serializeEntity(partRecord, { collectFinishes } = {}) {
  const object = partRecord?.obj;
  if (!object || isKoncisaPersistenceObject(object)) return null;

  const data = object.userData || {};
  const kind = resolvePersistentKind(object);
  const codigoPT = data.codigoPT || data.code || partRecord?.code || null;

  return {
    kind,
    instanceId: data.instanceId || object.uuid || null,
    codigoPT,
    code: data.code || codigoPT,
    transform: {
      position: object.position.toArray(),
      quaternion: object.quaternion.toArray(),
      rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
      scale: object.scale.toArray(),
    },
    materialBase: data.materialBase ?? null,
    materialCode: data.materialCode ?? null,
    finishes: kind === 'SURFACE' ? null : collectFinishes?.(object) || null,
    activeSubKey: kind === 'SURFACE' ? null : data.activeSubKey ?? null,
    activeSubName: kind === 'SURFACE' ? null : data.activeSubName ?? null,
    metadata: pickMetadata(object, kind),
  };
}

export function serializeProjectEntities(parts = [], options = {}) {
  const entities = [];
  const skipped = [];
  const processedAssemblies = new Set();

  parts.forEach((partRecord) => {
    const assembly = findKoncisaAssembly(partRecord?.obj);
    if (!assembly) return;
    const assemblyId = assembly.userData?.instanceId || assembly.userData?.code || assembly.uuid;
    if (processedAssemblies.has(assemblyId)) return;
    processedAssemblies.add(assemblyId);
    entities.push(serializeKoncisaAssembly(assembly, parts));
  });

  parts.forEach((partRecord) => {
    if (findKoncisaAssembly(partRecord?.obj) || isKoncisaPersistenceObject(partRecord?.obj)) {
      return;
    }

    const entity = serializeEntity(partRecord, options);
    if (entity) entities.push(entity);
  });

  return { entities, skipped };
}
