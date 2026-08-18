import { PROJECT_SCHEMA_VERSION, serializeProjectEntities } from './entitySerializers';

export function buildVersionedProject({ parts, collectFinishes, floor, camera, legacyParts }) {
  const { entities, skipped } = serializeProjectEntities(parts, { collectFinishes });
  return {
    version: '2.0',
    schemaVersion: PROJECT_SCHEMA_VERSION,
    units: 'm',
    floor,
    camera,
    entities,
    parts: legacyParts,
    persistenceDiagnostics: { skipped },
  };
}

export function isVersionedEntityProject(project) {
  return Number(project?.schemaVersion) >= PROJECT_SCHEMA_VERSION && Array.isArray(project?.entities);
}
