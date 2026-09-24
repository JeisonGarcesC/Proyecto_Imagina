export function registerLockerInstance({ instance, parent, partsRegistry, pickables }) {
  const object = instance?.object;
  if (object?.userData?.kind !== 'LOCKER_PRODUCT') throw new Error('LOCKER_PRODUCT_REQUIRED');
  parent.add(object);
  if (!partsRegistry.some(p => p.obj === object)) partsRegistry.push({ code: object.userData.codigoPT, obj: object });
  if (!pickables.includes(object)) pickables.push(object);
  return object;
}
