// src/clipboard/pasteClipboard.js
import { createKoncisaPlusInstance } from '../koncisaPlus/createKoncisaPlusInstance.js';
import { getClipboard } from './clipboardManager.js';
import {
  applyClipboardFinishes,
  applyClipboardTransform,
  CLIPBOARD_CONSTRUCTORS,
  createPasteInstructions,
} from './clipboardPasteFactory.js';

const DEFAULT_PASTE_OFFSET = Object.freeze([0.25, 0, 0.25]);

function withoutOldIdentity(metadata = {}) {
  const next = { ...metadata };
  ['instanceId', 'groupId', 'groupName', 'parentAssemblyId', 'parentCostadoInstanceId'].forEach(
    (key) => delete next[key]
  );
  return next;
}

function createPartPayload(instruction) {
  const configuration = instruction.payload?.configuration || {};
  const metadata = withoutOldIdentity(instruction.payload?.metadata || {});
  const model = configuration.model || metadata.model || null;
  const dimMm = configuration.dimMm || metadata.dimMm || configuration.dim || metadata.dim || null;

  return {
    ...metadata,
    type: metadata.kind || instruction.source?.kind || metadata.type || 'PART',
    code: instruction.payload?.code || metadata.code || null,
    codigoPT: instruction.payload?.codigoPT || metadata.codigoPT || null,
    logicalCode: metadata.logicalCode || null,
    name: metadata.description || metadata.name || instruction.payload?.code || 'Copia',
    description: metadata.description || metadata.name || null,
    line: metadata.line || null,
    model,
    dim: configuration.dim || metadata.dim || null,
    dimMm,
    billingDimMm: configuration.billingDimMm || metadata.billingDimMm || null,
    procedural: configuration.procedural || metadata.procedural || null,
    meta: metadata.meta || {},
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  };
}

async function executeInstruction(api, instruction) {
  const payload = createPartPayload(instruction);

  switch (instruction.constructor) {
    case CLIPBOARD_CONSTRUCTORS.ADD_KONCISA_ASSEMBLY: {
      const config = instruction.payload?.configuration?.config;
      if (!config) throw new Error('El puesto Koncisa copiado no contiene su configuración.');
      const result = await createKoncisaPlusInstance({
        api,
        config,
        transformOverrides: instruction.transform,
      });
      return result?.assembly || null;
    }
    case CLIPBOARD_CONSTRUCTORS.ADD_EXTERNAL_GLB:
      return api.addExternalGlbPart?.(payload);
    case CLIPBOARD_CONSTRUCTORS.ADD_NATIVE_BLOCK:
      return api.addNativeBlockPart?.(payload);
    case CLIPBOARD_CONSTRUCTORS.ADD_NATIVE_DUCT:
      return api.addNativeKoncisaDuctPart?.(payload);
    case CLIPBOARD_CONSTRUCTORS.ADD_KONCISA_COSTADO:
      return api.addKoncisaCostadoAssemblyPart?.(payload);
    case CLIPBOARD_CONSTRUCTORS.ADD_KONCISA_LEADER_SKIRT:
      return api.addKoncisaLeaderSkirtAssemblyPart?.(payload);
    case CLIPBOARD_CONSTRUCTORS.ADD_SURFACE: {
      const procedural = payload.procedural || {};
      const dim = payload.dim || payload.dimMm || {};
      return api.addSurface?.({
        ...payload,
        widthM: Number(procedural.widthM ?? dim.widthMm / 1000),
        depthM: Number(procedural.depthM ?? dim.depthMm / 1000),
        thicknessM: Number(procedural.thicknessM ?? (dim.thickMm ?? dim.thicknessMm) / 1000),
      });
    }
    case CLIPBOARD_CONSTRUCTORS.ADD_CATALOG_ITEM:
      return api.addClipboardCatalogItem?.(
        instruction.source?.kind,
        instruction.payload?.codigoPT || instruction.payload?.code
      );
    default:
      throw new RangeError(`Constructor de pegado no soportado: ${instruction.constructor}.`);
  }
}

function registerIdentity(identityMap, instruction, object) {
  const oldId =
    instruction.source?.relationships?.oldId || instruction.payload?.relationships?.oldId;
  const newId = object?.userData?.instanceId || object?.uuid || null;
  if (oldId && newId) identityMap.set(oldId, newId);
}

export async function pasteClipboard({ api, offset = DEFAULT_PASTE_OFFSET } = {}) {
  if (!api) throw new TypeError('pasteClipboard requiere la API de ThreeCanvas.');

  const clipboard = getClipboard();
  if (!clipboard?.items?.length) return { objects: [], identityMap: new Map() };

  const instructions = createPasteInstructions(clipboard).map((instruction) =>
    applyClipboardFinishes(applyClipboardTransform(instruction, { offset }))
  );
  const objects = [];
  const identityMap = new Map();

  for (const instruction of instructions) {
    const object = await executeInstruction(api, instruction);
    if (!object) continue;

    api.applyClipboardObjectState?.(object, instruction);
    registerIdentity(identityMap, instruction, object);
    if (instruction.constructor === CLIPBOARD_CONSTRUCTORS.ADD_KONCISA_ASSEMBLY) {
      api.mapPastedAssemblyIdentities?.(instruction, object)?.forEach(([oldId, newId]) => {
        identityMap.set(oldId, newId);
      });
    }
    objects.push(object);
  }

  api.selectCreatedObjects?.(objects);
  return { objects, identityMap };
}
