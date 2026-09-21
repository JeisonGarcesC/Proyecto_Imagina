let sequence = 0;
export function createVetroInstanceId() {
  sequence += 1;
  return `VETRO_${Date.now().toString(36).toUpperCase()}_${sequence.toString(36).toUpperCase()}`;
}
export function createVetroInstanceDefinition({ instanceId, config, product, transform } = {}) {
  return {
    schemaVersion: 1,
    kind: 'VETRO_PRODUCT',
    family: 'VETRO',
    instanceId: String(instanceId),
    config: JSON.parse(JSON.stringify(config || {})),
    product: JSON.parse(JSON.stringify(product || {})),
    transform: transform ? JSON.parse(JSON.stringify(transform)) : null,
  };
}
