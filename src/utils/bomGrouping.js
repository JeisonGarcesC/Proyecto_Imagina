const RUNTIME_CONFIG_KEYS = new Set([
  'groupId',
  'groupName',
  'instanceId',
  'parentAssemblyId',
  'position',
  'transform',
  'silentCreation',
]);

export function getKoncisaPlusAssembly(object) {
  let current = object || null;

  while (current) {
    if (current.userData?.kind === 'KONCISA_PLUS_ASSEMBLY') {
      return current;
    }
    current = current.parent || null;
  }

  return null;
}

function normalizeConfigValue(value) {
  if (Array.isArray(value)) return value.map(normalizeConfigValue);
  if (!value || typeof value !== 'object') return value;

  return Object.keys(value)
    .filter((key) => !RUNTIME_CONFIG_KEYS.has(key))
    .sort()
    .reduce((normalized, key) => {
      const item = normalizeConfigValue(value[key]);
      if (item !== undefined) normalized[key] = item;
      return normalized;
    }, {});
}

export function resolveKoncisaBomConfigurationKey(assembly) {
  if (assembly?.userData?.kind !== 'KONCISA_PLUS_ASSEMBLY') return null;
  return JSON.stringify(normalizeConfigValue(assembly.userData?.config || {}));
}

export function resolveBomGroupInstanceId(object, fallbackId = null) {
  const assembly = getKoncisaPlusAssembly(object);
  if (assembly) {
    return assembly.userData?.instanceId || assembly.uuid || fallbackId;
  }

  return object?.userData?.instanceId || object?.uuid || fallbackId;
}
