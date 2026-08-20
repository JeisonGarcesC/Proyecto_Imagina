import * as THREE from 'three';
import {
  buildCritterium8Junction3D,
  disposeCritterium8Junction3D,
} from '../junctions/renderers/Critterium8JunctionRenderer3D.js';
import { disposeCritterium8FrameAssembly3D } from '../renderers/Critterium8FrameRenderer3D.js';

function expandFrameBounds(bounds, frame) {
  const local = frame?.userData?.bounds2d;
  const center = local?.localCenter;
  const size = local?.sizeLocal;
  if (!Array.isArray(center) || !Array.isArray(size)) return;
  frame.updateMatrixWorld(true);
  for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) {
    bounds.expandByPoint(new THREE.Vector3(
      Number(center[0]) + Number(size[0]) * x,
      Number(center[1]) + Number(size[1]) * y,
      Number(center[2]) + Number(size[2]) * z,
    ).applyMatrix4(frame.matrixWorld));
  }
}

function expandJunctionBounds(bounds, layout) {
  const logical = layout?.bounds;
  if (!logical) return;
  const rotationY = Number(layout.rotationY || 0);
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  for (const x of [Number(logical.minX), Number(logical.maxX)]) {
    for (const y of [Number(logical.minY), Number(logical.maxY)]) {
      for (const z of [Number(logical.minZ), Number(logical.maxZ)]) {
        bounds.expandByPoint(new THREE.Vector3(
          Number(layout.position?.x || 0) + x * cos + z * sin,
          Number(layout.position?.y || 0) + y,
          Number(layout.position?.z || 0) - x * sin + z * cos,
        ));
      }
    }
  }
}

function serializeBounds(bounds) {
  return bounds.isEmpty() ? null : { min: bounds.min.toArray(), max: bounds.max.toArray() };
}

export function buildCritterium8FrameSequence3D({
  sequence = {}, frameInstances = [], junctionResolutions = [], junctionLayouts = [],
} = {}) {
  const root = new THREE.Group();
  const sequenceId = String(sequence.id || 'UNIDENTIFIED');
  const resolutionById = new Map(junctionResolutions.map((item) => [String(item.junctionId), item]));
  const layoutById = new Map(junctionLayouts.map((item) => [String(item.junctionId), item]));
  const frameById = new Map(frameInstances.map((object) => [String(object?.userData?.frameId || ''), object]));
  const bounds = new THREE.Box3();
  const diagnostics = [];

  root.name = `CRITTERIUM_8_SEQUENCE_${sequenceId}`;
  root.userData = {
    kind: 'CRITTERIUM_8_SEQUENCE_ASSEMBLY', family: 'CRITTERIUM_8', sequenceId,
    instanceId: sequenceId, code: sequenceId, codigoPT: sequenceId,
    frameIds: [...(sequence.frameIds || [])],
    junctionIds: (sequence.junctions || []).map((junction) => String(junction.id)),
    isAssemblyRoot: true, isPartRoot: true, selectionRoot: true, excludeFromBOM: true,
    sequence: JSON.parse(JSON.stringify(sequence)),
    metadata: {
      ...(sequence.metadata || {}),
      dirtyConnections: false,
      dirtyJunctions: false,
    },
  };

  for (const frameId of root.userData.frameIds) {
    const frame = frameById.get(String(frameId));
    if (!frame) {
      diagnostics.push({ code: 'MISSING_FRAME_INSTANCE', level: 'ERROR', frameId });
      continue;
    }
    expandFrameBounds(bounds, frame);
    root.attach(frame);
  }

  const reports = [];
  for (const junction of sequence.junctions || []) {
    const junctionId = String(junction.id);
    const resolution = resolutionById.get(junctionId) || { junctionId, type: junction.type, parts: [], diagnostics: [], valid: false };
    const layout = layoutById.get(junctionId);
    if (!layout) {
      diagnostics.push({ code: 'MISSING_JUNCTION_LAYOUT', level: 'ERROR', junctionId });
      continue;
    }
    const group = buildCritterium8Junction3D({ junction, resolution, layout });
    group.userData.sequenceId = sequenceId;
    group.traverse((child) => { if (child.userData?.kind === 'CRITTERIUM_8_JUNCTION_PART') child.userData.sequenceId = sequenceId; });
    root.add(group);
    expandJunctionBounds(bounds, layout);
    reports.push(group.userData.renderReport);
  }

  const logicalBounds = serializeBounds(bounds);
  root.userData.bounds = logicalBounds;
  if (logicalBounds) {
    root.userData.bounds2d = {
      localCenter: [
        (logicalBounds.min[0] + logicalBounds.max[0]) / 2,
        (logicalBounds.min[1] + logicalBounds.max[1]) / 2,
        (logicalBounds.min[2] + logicalBounds.max[2]) / 2,
      ],
      sizeLocal: [
        logicalBounds.max[0] - logicalBounds.min[0],
        logicalBounds.max[1] - logicalBounds.min[1],
        logicalBounds.max[2] - logicalBounds.min[2],
      ],
    };
  }
  root.userData.renderReport = {
    renderedJunctions: reports.flatMap((report) => report.renderedJunctions),
    placeholderJunctions: reports.flatMap((report) => report.placeholderJunctions),
    replacedByDuct: reports.flatMap((report) => report.replacedByDuct),
    missingAssets: reports.flatMap((report) => report.missingAssets),
    diagnostics: [...diagnostics, ...reports.flatMap((report) => report.diagnostics)],
  };
  root.updateMatrixWorld(true);
  return root;
}

export function disposeCritterium8Sequence3D(root, { disposeFrames = true } = {}) {
  for (const child of [...(root?.children || [])]) {
    if (child.userData?.kind === 'CRITTERIUM_8_JUNCTION') disposeCritterium8Junction3D(child);
    if (disposeFrames && child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY') disposeCritterium8FrameAssembly3D(child);
    root.remove(child);
  }
}
