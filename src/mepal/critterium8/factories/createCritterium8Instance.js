import { createCritterium8FrameDefinition } from '../definitions/frameDefinition.js';
import {
  applyGrowthModuleToComposition,
  buildCritterium8FrameComposition,
} from '../composition/frameComposition.js';
import { resolveCritterium8FrameParts } from '../parts/framePartResolver.js';
import { buildCritterium8FrameAssemblyLayout } from '../layout/frameLayoutBuilder.js';
import { buildCritterium8Frame3D } from '../builders/Critterium8RenderBuilder.js';

let instanceSequence = 0;

function cloneSerializable(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createInstanceId() {
  instanceSequence += 1;
  return `C8_${Date.now().toString(36).toUpperCase()}_${instanceSequence.toString(36).toUpperCase()}`;
}

function normalizeGrowthModules(value) {
  if (Array.isArray(value)) return value.map((module) => ({ ...module }));
  const count = Math.max(0, Math.trunc(Number(value) || 0));
  return Array.from({ length: count }, (_, index) => ({ index }));
}

function applyTransform(object, transform = {}) {
  if (Array.isArray(transform.position)) object.position.fromArray(transform.position);
  else if (transform.position) object.position.set(Number(transform.position.x) || 0, Number(transform.position.y) || 0, Number(transform.position.z) || 0);
  if (Array.isArray(transform.quaternion) && transform.quaternion.length === 4) object.quaternion.fromArray(transform.quaternion);
  else if (Array.isArray(transform.rotation)) object.rotation.fromArray(transform.rotation);
  else if (transform.rotation) object.rotation.set(Number(transform.rotation.x) || 0, Number(transform.rotation.y) || 0, Number(transform.rotation.z) || 0);
  if (Array.isArray(transform.scale)) object.scale.fromArray(transform.scale);
  object.updateMatrixWorld(true);
}

export async function createCritterium8Instance(options = {}) {
  const instanceId = String(options.instanceId || createInstanceId());
  const frameMode = String(options.frameMode || 'HALF_HEIGHT').toUpperCase();
  const projectHeightCm = Number(options.projectHeightCm || options.heightCm || 90);
  const config = {
    widthCm: Number(options.widthCm || 60),
    heightCm: Number(options.heightCm || 90),
    frameMode,
    compositionMode: String(options.compositionMode || 'MODULAR').toUpperCase(),
    projectHeightCm,
    growthModules: normalizeGrowthModules(options.growthModules),
    tiles: Array.isArray(options.tiles) ? options.tiles.map((tile) => ({ ...tile })) : [],
  };
  const frameId = String(options.frameId || `${instanceId}_FRAME`);
  const assemblyId = String(options.assemblyId || instanceId);
  const groupId = String(options.groupId || assemblyId);
  const frame = createCritterium8FrameDefinition({
    id: frameId,
    widthCm: config.widthCm,
    heightCm: frameMode === 'FLOOR_TO_CEILING' ? projectHeightCm : config.heightCm,
    frameMode,
    compositionMode: config.compositionMode,
    tiles: config.tiles,
  });
  let composition = buildCritterium8FrameComposition(frame);
  const diagnostics = [...(composition.diagnostics || [])];
  if (config.growthModules.length) {
    const growth = applyGrowthModuleToComposition(frame, composition, { moduleCount: config.growthModules.length });
    if (growth.valid) composition = growth.composition;
    else diagnostics.push(...growth.errors.map((code) => ({ code, level: 'ERROR', source: 'GROWTH_MODULE' })));
  }
  const resolved = resolveCritterium8FrameParts(frame, { composition });
  diagnostics.push(...(resolved.diagnostics || []));
  const parts = resolved.parts;
  const layout = buildCritterium8FrameAssemblyLayout({ frame, composition, parts });
  diagnostics.push(...(layout.diagnostics || []));
  const assembly = await buildCritterium8Frame3D({ frame, composition, parts, layout });

  const widthM = config.widthCm / 100;
  const depthM = Number(layout.depthCm || frame.thicknessCm || 8) / 100;
  const heightM = Number(layout.heightCm || frame.heightCm) / 100;
  const definition = cloneSerializable(frame);
  const serializableComposition = cloneSerializable(composition);
  const serializableLayout = cloneSerializable(layout);
  const serializableParts = cloneSerializable(parts);
  const serializableConfig = cloneSerializable(config);
  assembly.userData = {
    ...assembly.userData,
    kind: 'CRITTERIUM_8_ASSEMBLY',
    family: 'CRITTERIUM_8',
    type: 'critterium-8',
    code: instanceId,
    codigoPT: instanceId,
    instanceId,
    frameId,
    assemblyId,
    parentAssemblyId: null,
    groupId,
    definition,
    composition: serializableComposition,
    layout: serializableLayout,
    config: serializableConfig,
    partsDefinition: serializableParts,
    isAssemblyRoot: true,
    isPartRoot: true,
    selectionRoot: true,
    excludeFromBOM: true,
    bounds2d: { localCenter: [0, heightM / 2, 0], sizeLocal: [widthM, heightM, depthM] },
    footprint2D: { type: 'RECTANGLE', bounds: { w: widthM, d: depthM } },
  };

  const partById = new Map(parts.map((part) => [part.id, part]));
  assembly.children.forEach((child) => {
    const part = partById.get(child.userData?.partId);
    child.userData = {
      ...child.userData,
      code: part?.code || part?.id || child.userData?.partId,
      codigoPT: part?.code || null,
      instanceId: `${instanceId}__${child.userData?.partId || child.id}`,
      assemblyId,
      parentAssemblyId: assemblyId,
      groupId,
      excludeFromIndependentMove: true,
      excludeFromBOM: true,
    };
    child.traverse((descendant) => {
      if (descendant === child) return;
      descendant.userData = {
        ...descendant.userData,
        assemblyId,
        parentAssemblyId: assemblyId,
        groupId,
        excludeFromIndependentMove: true,
        excludeFromBOM: true,
      };
    });
  });
  applyTransform(assembly, options.transform);

  return { assembly, frame: definition, composition: serializableComposition, parts: serializableParts, layout: serializableLayout, diagnostics: cloneSerializable(diagnostics) };
}
