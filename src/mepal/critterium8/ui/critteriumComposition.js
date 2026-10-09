const unique = (values) => new Set(values.filter(Boolean)).size === values.filter(Boolean).length;

export function buildCritteriumComposition(structure, systemId, selectedPart = null, selectedConnectionId = '') {
  const systems = structure?.systems || [];
  const sequences = structure?.sequences || [];
  const selectedSystemId = selectedPart?.critteriumSystem?.systemId || null;
  const selectedSequenceId = selectedPart?.critterium8Sequence?.sequenceId || null;
  const selectedFrameId = selectedPart?.critterium8?.instanceId || null;
  const system = systems.find((item) => item.systemId === (selectedSystemId || systemId)) || null;
  const visibleSequences = system
    ? (system.sequenceIds || []).map((id) => sequences.find((item) => item.sequenceId === id)).filter(Boolean)
    : selectedSequenceId
      ? sequences.filter((item) => item.sequenceId === selectedSequenceId)
      : sequences.filter((item) => !item.parentSystemId);
  const sequenceIndex = new Map((system?.sequenceIds || visibleSequences.map((item) => item.sequenceId))
    .map((id, index) => [id, index + 1]));
  const sequenceItems = visibleSequences.map((sequence) => {
    const slots = (sequence.slots || []).map((slot, index) => ({
      slotId: slot.slotId,
      moduleId: slot.moduleId,
      frameId: slot.frameId,
      frameInstanceId: slot.frameInstanceId || null,
      number: index + 1,
      widthCm: slot.widthCm,
      heightCm: slot.frameMode === 'FLOOR_TO_CEILING' ? slot.projectHeightCm || slot.heightCm : slot.heightCm,
      frameMode: slot.frameMode || 'HALF_HEIGHT',
      status: slot.status === 'MISSING_FRAME' || !slot.frameInstanceId ? 'MISSING_FRAME' : 'READY',
      selected: !!selectedFrameId && selectedFrameId === slot.frameInstanceId,
    }));
    return {
      sequenceId: sequence.sequenceId,
      number: sequenceIndex.get(sequence.sequenceId) || 1,
      selected: selectedSequenceId === sequence.sequenceId && !selectedFrameId,
      containsSelection: selectedSequenceId === sequence.sequenceId,
      slots,
      frameCount: slots.filter((item) => !!item.frameInstanceId).length,
      diagnostics: sequence.diagnostics || [],
    };
  });
  const connections = (system?.connections || []).map((item) => ({
    connectionId: item.connectionId,
    sourceSequenceId: item.sourceSequenceId,
    targetSequenceId: item.targetSequenceId,
    sourceNumber: sequenceIndex.get(item.sourceSequenceId) || '?',
    targetNumber: sequenceIndex.get(item.targetSequenceId) || '?',
    type: item.type,
    selected: item.connectionId === selectedConnectionId,
  }));
  const allSlots = sequenceItems.flatMap((item) => item.slots);
  return {
    systemId: system?.systemId || null,
    systemSelected: !!system && selectedSystemId === system.systemId,
    sequences: sequenceItems,
    connections,
    counts: { sequences: sequenceItems.length, modules: allSlots.length,
      frames: allSlots.filter((item) => !!item.frameInstanceId).length, connections: connections.length },
    idsUnique: unique([system?.systemId, ...sequenceItems.map((item) => item.sequenceId),
      ...allSlots.flatMap((item) => [item.slotId, item.moduleId, item.frameId]),
      ...connections.map((item) => item.connectionId)]),
  };
}
