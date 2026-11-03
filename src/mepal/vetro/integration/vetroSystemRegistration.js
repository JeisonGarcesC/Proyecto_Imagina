export function registerVetroSystem({ instance, parent, partsRegistry, pickables } = {}) {
  const root = instance?.object;
  if (root?.userData?.kind !== 'VETRO_SYSTEM') throw new Error('VETRO_SYSTEM_REQUIRED');
  parent?.add?.(root);
  partsRegistry?.push?.({ code: null, obj: root });
  root.children.forEach((child) => {
    partsRegistry?.push?.({ code: child.userData.codigoPT, obj: child });
  });
  pickables?.push?.(root);
  return root;
}
