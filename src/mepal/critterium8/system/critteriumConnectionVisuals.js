import * as THREE from 'three';
import { resolveCritteriumConnectionPoints, findCritteriumSequence, validateCritteriumSpatialConnection } from './layout/CritteriumConnectionResolver.js';
import { describeCritterium8FrameAssembly } from '../integration/critterium8SequenceOperations.js';
import { resolveCritterium8JunctionParts } from '../junctions/junctionPartResolver.js';
import { buildCritterium8JunctionLayout } from '../junctions/layout/junctionLayoutBuilder.js';
import { buildCritterium8Junction3D, disposeCritterium8Junction3D } from '../junctions/renderers/Critterium8JunctionRenderer3D.js';

const visualKind = 'CRITTERIUM_8_SPATIAL_KIT';

export function reconcileCritteriumConnectionVisuals(scene, partsRegistry = [], { loadAccessory } = {}) {
  if (!scene) return [];
  const systems = scene.children.filter((child) => child.userData?.kind === 'CRITERIUM_SYSTEM');
  for (const system of systems) delete system.userData.footprint2D;
  for (const system of systems) for (const sequence of system.children) {
    if (sequence.userData?.kind !== 'CRITTERIUM_8_SEQUENCE_ASSEMBLY') continue;
    delete sequence.userData.footprint2D;
    for (const junction of sequence.children) {
      if (junction.userData?.kind === 'CRITTERIUM_8_JUNCTION' && junction.userData.junctionType === 'TERMINAL') junction.visible = true;
    }
  }
  for (const entry of [...partsRegistry]) {
    if (entry.obj?.userData?.kind !== visualKind) continue;
    entry.obj.parent?.remove(entry.obj);
    disposeCritterium8Junction3D(entry.obj);
    partsRegistry.splice(partsRegistry.indexOf(entry), 1);
  }
  const created = [];
  for (const system of systems) for (const connection of system.userData.connections || []) {
    if (connection.type !== 'LINEAR' || !validateCritteriumSpatialConnection(system, connection).valid) continue;
    const sourceSequence = findCritteriumSequence(system, connection.sourceSequenceId);
    const targetSequence = findCritteriumSequence(system, connection.targetSequenceId);
    const source = resolveCritteriumConnectionPoints(sourceSequence).find((point) => point.connectionId === connection.sourcePointId);
    const target = resolveCritteriumConnectionPoints(targetSequence).find((point) => point.connectionId === connection.targetPointId);
    if (!source || !target) continue;
    const sourceFrame = sourceSequence.children.find((child) => child.userData?.frameId === source.frameId);
    const targetFrame = targetSequence.children.find((child) => child.userData?.frameId === target.frameId);
    if (!sourceFrame || !targetFrame) continue;
    const frames = [sourceFrame, targetFrame].map(describeCritterium8FrameAssembly);
    const junctionId = `C8_SPATIAL_${connection.connectionId}`;
    const junction = { id: junctionId, type: 'DEG_180',
      point: { x: (source.position[0] + target.position[0]) / 2, z: (source.position[2] + target.position[2]) / 2 },
      endpointRefs: [source, target].map((point) => ({ frameId: point.frameId, endpoint: point.type.slice('TERMINAL_'.length) })) };
    const resolution = resolveCritterium8JunctionParts({ junction, frames });
    if (!resolution.valid) continue;
    const layout = buildCritterium8JunctionLayout({ junction, resolution, frames });
    if (!layout.valid) continue;
    const kit = buildCritterium8Junction3D({ junction, resolution, layout, loadAccessory });
    kit.userData.kind = visualKind;
    kit.userData.connectionId = connection.connectionId;
    kit.userData.sourceSystemId = system.userData.systemId;
    kit.userData.targetSystemId = connection.targetSystemId || system.userData.systemId;
    kit.userData.bounds2d = { localCenter: [0, (layout.bounds.minY + layout.bounds.maxY) / 2, 0],
      sizeLocal: [layout.bounds.maxX - layout.bounds.minX, layout.bounds.maxY - layout.bounds.minY,
        layout.bounds.maxZ - layout.bounds.minZ] };
    kit.userData.excludeFromBOM = true;
    scene.add(kit);
    partsRegistry.push({ obj: kit, code: resolution.kitCode });
    for (const [sequence, point] of [[sourceSequence, source], [targetSequence, target]]) {
      const terminal = sequence.children.find((child) => child.userData?.kind === 'CRITTERIUM_8_JUNCTION' && child.userData.junctionId === point.connectionId);
      if (terminal) terminal.visible = false;
    }
    created.push(kit);
  }
  return created;
}
