function looksLikeGuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function getMeshPathKey(root, mesh, { legacyLockerNames = false } = {}) {
  const path = [];
  let current = mesh;
  while (current && current !== root) {
    const name = current.name?.trim() || '';
    const siblings = current.parent?.children || [];
    const index = siblings.indexOf(current);
    const repeatedLockerName = !legacyLockerNames && root?.userData?.kind === 'LOCKER_PRODUCT' && name &&
      siblings.some((sibling) => sibling !== current && sibling.name?.trim() === name);
    path.push(name && !looksLikeGuid(name) && !repeatedLockerName ? `n:${name}` : `i:${index}`);
    current = current.parent;
  }
  return path.reverse().join('/');
}
