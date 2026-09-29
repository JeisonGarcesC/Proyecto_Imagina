import { buildMultipleSystem } from './MultipleSystemBuilder.js';
import { restoreMultipleSystem } from './multipleSystemSerialization.js';
import { registerMultipleInstance } from '../integration/multipleIntegration.js';

export function registerMultipleSystem({ instance, parent, partsRegistry, pickables }) {
  const object = instance?.object;
  if (object?.userData?.kind !== 'MULTIPLE_SYSTEM') throw new Error('MULTIPLE_SYSTEM_REQUIRED');
  parent.add(object);
  if (!partsRegistry.some((entry) => entry.obj === object)) partsRegistry.push({ code: null, obj: object });
  for (const product of instance.products || object.children) registerMultipleInstance({ instance: { object: product }, parent: object, partsRegistry, pickables });
  return object;
}

export function createMultipleSystemInstance(input) { return buildMultipleSystem(input); }
export { restoreMultipleSystem };
