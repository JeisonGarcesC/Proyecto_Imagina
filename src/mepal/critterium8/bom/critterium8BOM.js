import { resolveCritterium8FrameCommercialCode, resolveCritterium8TileCommercial } from '../parts/partCatalog.js';
import { resolveCritterium8JunctionParts } from '../junctions/junctionPartResolver.js';
import { getCritterium8JunctionKitEntry } from '../junctions/junctionPartCatalog.js';
import { findCritteriumSequence, resolveCritteriumConnectionPoints, validateCritteriumSpatialConnection } from '../system/layout/CritteriumConnectionResolver.js';

const codedTypes = new Set(['GROWTH_MODULE', 'CEILING_POST', 'CEILING_U']);

function commercialRow(part, sourceId) {
  return {
    code: String(part.code),
    reference: part.metadata?.reference ?? null,
    description: part.description || String(part.code),
    qty: Number(part.quantity || 1),
    materialCode: part.metadata?.materialCode ?? null,
    finishCode: part.metadata?.finishCode ?? null,
    category: 'CRITTERIUM_8',
    sourceId,
  };
}

// The registry contains frame roots and their physical children. Read only the
// commercial definitions on frame/sequence roots; system roots add no rows.
export function resolveCritterium8BOM(partsRegistry = []) {
  const rows = [];
  const diagnostics = [];
  const seenFrames = new Set();
  const seenJunctions = new Set();
  const occupiedTerminals = new Set();
  for (const { obj: system } of partsRegistry) {
    if (system?.userData?.kind !== 'CRITERIUM_SYSTEM') continue;
    for (const connection of system.userData.connections || []) {
      if (connection.type !== 'LINEAR' || !validateCritteriumSpatialConnection(system, connection).valid) continue;
      const source = resolveCritteriumConnectionPoints(findCritteriumSequence(system, connection.sourceSequenceId))
        .find((point) => point.connectionId === connection.sourcePointId);
      const target = resolveCritteriumConnectionPoints(findCritteriumSequence(system, connection.targetSequenceId))
        .find((point) => point.connectionId === connection.targetPointId);
      if (!source || !target || source.heightCm !== target.heightCm || source.frameMode !== target.frameMode) continue;
      const entry = getCritterium8JunctionKitEntry({ type: 'DEG_180', heightCm: source.heightCm,
        floorToCeiling: source.frameMode === 'FLOOR_TO_CEILING' });
      if (!entry) continue;
      occupiedTerminals.add(connection.sourcePointId);
      occupiedTerminals.add(connection.targetPointId);
      rows.push({ code: entry.code, reference: null, description: 'Kit de unión DEG_180', qty: 1,
        materialCode: null, finishCode: null, category: 'CRITTERIUM_8', sourceId: connection.connectionId });
    }
  }

  for (const { obj } of partsRegistry) {
    const data = obj?.userData;
    if (data?.kind !== 'CRITTERIUM_8_ASSEMBLY') continue;
    const frameId = String(data.frameId || data.instanceId || '');
    if (!frameId || seenFrames.has(frameId)) continue;
    seenFrames.add(frameId);

    const composition = data.composition || {};
    const code = resolveCritterium8FrameCommercialCode({
      widthCm: composition.widthCm ?? data.config?.widthCm,
      heightCm: composition.baseFrameHeightCm ?? composition.heightCm ?? data.config?.heightCm,
    });
    if (code) {
      rows.push({ code, reference: null, description: `Marco Critterium 8 ${composition.widthCm ?? data.config?.widthCm} × ${composition.baseFrameHeightCm ?? composition.heightCm ?? data.config?.heightCm} cm`, qty: 1,
        materialCode: data.config?.materialCode ?? null, finishCode: data.config?.finishCode ?? null,
        category: 'CRITTERIUM_8', sourceId: frameId });
    } else {
      diagnostics.push({ code: 'MISSING_DOCUMENTED_FRAME_CODE', frameId });
    }

    const commercialTiles = Array.isArray(data.commercialTiles) ? data.commercialTiles : [];
    for (const slot of composition.tileSlots || []) {
      if (!slot.tile) continue;
      const commercial = commercialTiles.find((item) => item.slotId === slot.id)
        || resolveCritterium8TileCommercial({
          tileType: slot.tile.tileType || slot.tile.type,
          widthCm: composition.widthCm ?? data.config?.widthCm,
          heightCm: slot.heightCm,
          commercialOptions: slot.tile.commercialOptions,
        });
      const physicalParts = (data.partsDefinition || []).filter((part) =>
        part.type === 'TILE' && part.slotId === slot.id
      );
      const quantity = physicalParts.length;
      if (!quantity) continue;
      const byFinish = new Map();
      for (const part of physicalParts) {
        const materialCode = part.metadata?.materialCode ?? null;
        const finishCode = part.metadata?.finishCode ?? null;
        const key = JSON.stringify([materialCode, finishCode]);
        if (!byFinish.has(key)) byFinish.set(key, { qty: 0, materialCode, finishCode });
        byFinish.get(key).qty += Number(part.quantity || 1);
      }
      if (commercial.status !== 'RESOLVED' || !commercial.code) {
        diagnostics.push(...(commercial.diagnostics || []).map((item) => ({
          ...item, frameId, slotId: slot.id, status: commercial.status,
        })));
        for (const finish of byFinish.values()) rows.push({ code: null, reference: null,
          description: `Baldosa ${slot.tile.tileType || slot.tile.type} — Información comercial insuficiente`,
          ...finish, category: 'CRITTERIUM_8', sourceId: slot.id });
        continue;
      }
      for (const finish of byFinish.values()) rows.push({ code: commercial.code, reference: null,
        description: commercial.description, ...finish,
        category: 'CRITTERIUM_8', sourceId: slot.id });
    }

    for (const part of data.partsDefinition || []) {
      if (!codedTypes.has(part.type)) continue;
      if (!part.code) {
        diagnostics.push({ code: 'MISSING_DOCUMENTED_CODE', frameId, partType: part.type, partId: part.id });
        continue;
      }
      rows.push(commercialRow(part, frameId));
    }
  }

  for (const { obj } of partsRegistry) {
    const data = obj?.userData;
    if (data?.kind !== 'CRITTERIUM_8_SEQUENCE_ASSEMBLY') continue;
    const sequence = data.sequence || {};
    for (const junction of sequence.junctions || []) {
      const junctionId = String(junction.id || '');
      if (!junctionId || seenJunctions.has(junctionId)) continue;
      if (occupiedTerminals.has(junctionId)) continue;
      seenJunctions.add(junctionId);
      const result = resolveCritterium8JunctionParts({ junction, frames: sequence.frames || [] });
      diagnostics.push(...result.diagnostics.filter((entry) => entry.level !== 'INFO').map((entry) => ({ ...entry, sequenceId: data.sequenceId })));
      rows.push(...result.parts.filter((part) => part.code).map((part) => commercialRow(part, junctionId)));
    }
  }

  return { rows, diagnostics };
}
