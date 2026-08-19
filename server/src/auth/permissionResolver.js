const normalizeKeys = (keys) => new Set((keys || []).filter(Boolean).map(String));

export function resolveEffectivePermissions({ rolePermissions = [], overrides = [] } = {}) {
  const allowed = normalizeKeys(rolePermissions);
  const explicitAllow = new Set();
  const explicitDeny = new Set();

  for (const override of overrides || []) {
    const key = override?.permissionKey || override?.permission?.key;
    if (!key) continue;
    if (override.effect === 'DENY') explicitDeny.add(String(key));
    if (override.effect === 'ALLOW') explicitAllow.add(String(key));
  }

  for (const key of explicitAllow) allowed.add(key);
  for (const key of explicitDeny) allowed.delete(key);

  return Object.freeze([...allowed].sort());
}

export function hasPermission(input, permissionKey) {
  return resolveEffectivePermissions(input).includes(String(permissionKey));
}
