// src/mepal/mila/factories/createMilaPanelDivisorInstance.js
import * as THREE from 'three';
import { buildMilaPanelDivisor } from '../builders/MilaPanelDivisorBuilder.js';

function defaultNotify(message) {
  globalThis.alert?.(message);
}

export async function createMilaPanelDivisorInstance({
  api,
  config = {},
  parent = null,
  notify = defaultNotify,
} = {}) {
  if (!api) throw new TypeError('createMilaPanelDivisorInstance requires the ThreeCanvas API.');

  const built = buildMilaPanelDivisor(config);
  const { groupId, groupName, parts = [] } = built || {};

  const assembly =
    api.createMilaAssemblyGroup?.({
      ...config,
      kind: 'MILA_PANEL_DIVISOR_ASSEMBLY',
      type: 'mila-panel-divisor',
      line: 'MILA',
      groupId,
      groupName,
    }) || new THREE.Group();

  assembly.name = `MILA_BOOTH_${groupId}`;
  assembly.userData = {
    kind: 'MILA_PANEL_DIVISOR_ASSEMBLY',
    type: 'mila-panel-divisor',
    line: 'MILA',
    groupId,
    groupName,
    isPartRoot: true,
    instanceId: groupId,
    config: built.config,
  };

  if (parent && assembly.parent !== parent) {
    parent.add?.(assembly);
  }

  for (const part of parts) {
    if (!part?.code || !part?.model?.src) {
      notify(`Parte no disponible: ${part?.logicalCode || 'sin código'}`);
      continue;
    }

    await api.addExternalGlbPart?.({
      ...part,
      groupId: part.groupId || groupId,
      groupName: part.groupName || groupName,
      parentGroup: assembly,
      meta: {
        ...(part.meta || {}),
        parentAssemblyId: groupId,
        groupId,
      },
    });
  }

  assembly.updateMatrixWorld?.(true);
  api.selectObject?.(assembly);

  return {
    assembly,
    groupId,
    groupName,
    parts,
    config: built.config,
  };
}
