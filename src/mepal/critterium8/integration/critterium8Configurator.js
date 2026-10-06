import { validateCritterium8FrameDefinition } from '../definitions/frameDefinition.js';
import { resolveCritterium8ConfigPatch } from './critterium8Config.js';
import { buildCritterium8Sequences } from '../connectivity/frameSequenceResolver.js';

export const defaultCritteriumSequenceDraft = () => ({
  frames: [{ widthCm: 90, heightCm: 128, frameMode: 'HALF_HEIGHT', compositionMode: 'MODULAR', tiles: [], growthModules: [] },
    { widthCm: 90, heightCm: 128, frameMode: 'HALF_HEIGHT', compositionMode: 'MODULAR', tiles: [], growthModules: [] }],
  orientationDeg: 0,
});

export function validateCritteriumSequenceDraft(draft = {}) {
  if (!Array.isArray(draft.frames) || draft.frames.length < 2) return { success: false, reason: 'La secuencia requiere al menos dos frames.', field: 'frames' };
  const angle = Number(draft.orientationDeg || 0);
  if (![0, 90, 180, 270].includes(angle)) return { success: false, reason: 'Orientación no soportada.', field: 'orientationDeg' };
  const frames = [];
  for (const [index, input] of draft.frames.entries()) {
    const config = resolveCritterium8ConfigPatch({ config: { ...input, tiles: input.tiles || [] }, frameId: `PREVIEW_${index}` });
    if (!config.success) return { success: false, reason: config.reason, field: `frames.${index}`, diagnostics: config.diagnostics };
    const dimensions = validateCritterium8FrameDefinition({ ...config.config, id: `PREVIEW_${index}` });
    if (!dimensions.valid || !dimensions.catalogCodeAvailable) return { success: false, reason: dimensions.errors[0] || 'COMBINACIÓN_COMERCIAL_NO_DISPONIBLE', field: `frames.${index}` };
    frames.push(config.config);
  }
  const radians = angle * Math.PI / 180;
  const axisX = Math.cos(radians); const axisZ = -Math.sin(radians);
  let cursor = 0;
  const placements = frames.map((frame, index) => {
    const width = frame.widthCm / 100;
    const center = cursor + width / 2;
    cursor += width;
    return { frameId: `PREVIEW_${index}`, config: frame, position: [center * axisX, 0, center * axisZ], rotationY: radians };
  });
  const components = buildCritterium8Sequences(placements.map((item) => ({ frameId: item.frameId, instanceId: item.frameId,
    position: { x: item.position[0], z: item.position[2] }, rotationY: item.rotationY,
    widthCm: item.config.widthCm, heightCm: item.config.heightCm, frameMode: item.config.frameMode,
    projectHeightCm: item.config.projectHeightCm })));
  if (components.length !== 1 || components[0].frameIds.length !== frames.length) return { success: false, reason: 'Los frames no forman una secuencia conectada.', field: 'frames' };
  const errors = components[0].diagnostics.filter((item) => item.code === 'UNSUPPORTED_JUNCTION_GEOMETRY');
  if (errors.length) return { success: false, reason: errors[0].code, field: 'frames', diagnostics: errors };
  return { success: true, frames, placements, junctionCount: components[0].junctions.length, diagnostics: components[0].diagnostics };
}

export function validateCritteriumSystemDraft(drafts = []) {
  if (!Array.isArray(drafts) || !drafts.length) return { success: false, reason: 'Agrega al menos una secuencia.', field: 'sequences' };
  const sequences = drafts.map(validateCritteriumSequenceDraft);
  const invalid = sequences.findIndex((item) => !item.success);
  return invalid < 0 ? { success: true, sequences } : { ...sequences[invalid], field: `sequences.${invalid}.${sequences[invalid].field}` };
}
