// Logical module positions in a CRITERIUM sequence. These are distinct from
// the tile slots inside an individual frame.
const clone = (value) => JSON.parse(JSON.stringify(value));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const token = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;

export function createCritteriumModuleSlot({ sequenceId, frameId, moduleId, slotId, index = 0,
  position = [0, 0, 0], orientation = 0, widthCm, depthCm, transformOverride = null,
  frameMode = 'HALF_HEIGHT', heightCm = 0, status = 'OCCUPIED' } = {}) {
  if (!sequenceId || !slotId && !frameId) throw new Error('CRITTERIUM_MODULE_SLOT_ID_REQUIRED');
  if (!Number.isFinite(Number(widthCm)) || Number(widthCm) <= 0) throw new Error('CRITTERIUM_MODULE_SLOT_WIDTH_REQUIRED');
  return {
    slotId: String(slotId || `C8_SLOT_${token()}`), sequenceId: String(sequenceId), index,
    position: position.map((value) => finite(value)), orientation: finite(orientation),
    widthCm: Number(widthCm), depthCm: finite(depthCm), moduleType: 'FRAME',
    frameMode, heightCm: finite(heightCm),
    moduleId: String(moduleId || `C8_MODULE_${token()}`), frameId: frameId ? String(frameId) : null,
    status, transformOverride: transformOverride ? clone(transformOverride) : null,
  };
}

export function createCritteriumSlotConnections(slots = []) {
  return slots.slice(1).map((slot, index) => ({
    sourceSlotId: slots[index].slotId, targetSlotId: slot.slotId, type: 'ADJACENT',
  }));
}

// Preserve IDs by frame association even when a sequence is rebuilt from its
// physical frames. Legacy projects get deterministic IDs on their first load.
export function reconcileCritteriumModuleSlots(sequence, frames, previousSequence = null) {
  const previous = previousSequence?.slots || sequence.slots || [];
  const existing = new Map(previous.map((slot) => [String(slot.frameId), slot]));
  const ordered = previous.length
    ? [
        ...previous.map((slot) => frames.find((frame) => String(frame.frameId) === String(slot.frameId))).filter(Boolean),
        ...frames.filter((frame) => !existing.has(String(frame.frameId))),
      ]
    : frames;
  const slots = ordered.map((frame, index) => {
    const saved = existing.get(String(frame.frameId));
    const position = [finite(frame.position?.x), 0, finite(frame.position?.z)];
    return createCritteriumModuleSlot({
      ...saved, sequenceId: sequence.id, frameId: frame.frameId, index,
      slotId: saved?.slotId || `C8_SLOT_${sequence.id}_${frame.frameId}`,
      moduleId: saved?.moduleId || `C8_MODULE_${frame.instanceId || frame.frameId}`,
      position: saved?.position || position, orientation: saved?.orientation ?? frame.rotationY,
      widthCm: frame.widthCm, depthCm: saved?.depthCm ?? frame.depthCm,
      frameMode: frame.frameMode, heightCm: frame.heightCm,
      transformOverride: saved?.transformOverride || null,
    });
  });
  return { ...sequence, slots, slotConnections: createCritteriumSlotConnections(slots) };
}

// The first slot is the composition anchor. Widths come from commercial frame
// definitions, never from mesh bounds. Existing IDs survive index changes.
export function layoutCritteriumModuleSlots(slots, startPosition = null) {
  if (!slots.length) return [];
  const first = slots[0];
  const angle = finite(first.orientation);
  const direction = [Math.cos(angle), 0, -Math.sin(angle)];
  const start = startPosition || first.position.map((value, axis) => value - direction[axis] * finite(first.widthCm) / 200);
  let cursor = 0;
  return slots.map((slot, index) => {
    const width = finite(slot.widthCm) / 100;
    if (width <= 0) throw new Error('CRITTERIUM_MODULE_SLOT_WIDTH_REQUIRED');
    const position = start.map((value, axis) => value + direction[axis] * (cursor + width / 2));
    cursor += width;
    return { ...clone(slot), index, position, orientation: angle };
  });
}

export function editCritteriumModuleSlots(sequence, operation, { slotId, index, frameId,
  moduleId, slotIdNew, widthCm, depthCm } = {}) {
  const slots = clone(sequence.slots || []);
  const first = slots[0];
  const direction = [Math.cos(first.orientation), 0, -Math.sin(first.orientation)];
  const start = first.position.map((value, axis) => value - direction[axis] * first.widthCm / 200);
  const oldIndex = slots.findIndex((slot) => slot.slotId === slotId);
  const adding = ['ADD', 'INSERT', 'DUPLICATE'].includes(operation);
  if (!adding && operation !== 'ORGANIZE' && oldIndex < 0) throw new Error('CRITTERIUM_MODULE_SLOT_NOT_FOUND');
  if (operation === 'ORGANIZE') {
    slots.forEach((slot) => { slot.transformOverride = null; });
  } else if (operation === 'REMOVE') {
    if (slots.length <= 2) throw new Error('CRITTERIUM_SEQUENCE_REQUIRES_TWO_FRAMES');
    slots.splice(oldIndex, 1);
  } else if (operation === 'REORDER') {
    const target = Number(index);
    if (!Number.isInteger(target) || target < 0 || target >= slots.length) throw new Error('CRITTERIUM_MODULE_SLOT_INDEX_INVALID');
    slots.splice(target, 0, slots.splice(oldIndex, 1)[0]);
  } else if (operation === 'CONFIGURE') {
    if (widthCm != null) slots[oldIndex].widthCm = Number(widthCm);
    if (depthCm != null) slots[oldIndex].depthCm = Number(depthCm);
  } else if (adding) {
    const source = operation === 'DUPLICATE' ? slots[oldIndex] : slots[Math.max(0, Math.min(slots.length - 1, Number(index) || 0))];
    const insertion = operation === 'ADD' ? slots.length : operation === 'DUPLICATE' ? oldIndex + 1 : Number(index);
    if (!Number.isInteger(insertion) || insertion < 0 || insertion > slots.length) throw new Error('CRITTERIUM_MODULE_SLOT_INDEX_INVALID');
    if (!frameId || !moduleId || !slotIdNew) throw new Error('CRITTERIUM_MODULE_SLOT_NEW_ID_REQUIRED');
    slots.splice(insertion, 0, createCritteriumModuleSlot({
      ...source, sequenceId: sequence.id, slotId: slotIdNew, moduleId, frameId,
      widthCm: widthCm ?? source.widthCm, depthCm: depthCm ?? source.depthCm,
      transformOverride: null,
    }));
  } else throw new Error('CRITTERIUM_MODULE_SLOT_OPERATION_INVALID');
  const laidOut = layoutCritteriumModuleSlots(slots, start);
  return { ...sequence, slots: laidOut, slotConnections: createCritteriumSlotConnections(laidOut) };
}

export function captureCritteriumModuleOverrides(sequence, frames = []) {
  const byId = new Map(frames.map((frame) => [String(frame.frameId), frame]));
  return {
    ...sequence,
    slots: (sequence.slots || []).map((slot) => {
      const frame = byId.get(String(slot.frameId));
      if (!frame) return { ...slot, status: 'MISSING_FRAME' };
      const position = frame.position;
      const quaternion = frame.quaternion;
      const delta = Math.hypot(...position.map((value, axis) => value - slot.position[axis]));
      const expectedY = Math.sin(slot.orientation / 2);
      const rotationChanged = Math.abs(Math.abs(quaternion[1]) - Math.abs(expectedY)) > 1e-6;
      return { ...slot, status: 'OCCUPIED', transformOverride: delta > 1e-6 || rotationChanged
        ? { position: [...position], quaternion: [...quaternion] } : null };
    }),
  };
}
