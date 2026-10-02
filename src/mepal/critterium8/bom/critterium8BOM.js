import { resolveCritterium8FrameCommercialCode } from '../parts/partCatalog.js';
import { resolveCritterium8JunctionParts } from '../junctions/junctionPartResolver.js';

const codedTypes = new Set(['TILE', 'GROWTH_MODULE', 'CEILING_POST', 'CEILING_U']);

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
      seenJunctions.add(junctionId);
      const result = resolveCritterium8JunctionParts({ junction, frames: sequence.frames || [] });
      diagnostics.push(...result.diagnostics.filter((entry) => entry.level !== 'INFO').map((entry) => ({ ...entry, sequenceId: data.sequenceId })));
      rows.push(...result.parts.filter((part) => part.code).map((part) => commercialRow(part, junctionId)));
    }
  }

  return { rows, diagnostics };
}
