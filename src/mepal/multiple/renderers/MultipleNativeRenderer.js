import { BoxGeometry, Group, Mesh } from 'three';
import { createMultipleMaterial } from './multipleMaterials.js';

export const MULTIPLE_VISUAL_APPROXIMATIONS_CM = Object.freeze({ profileFace: 3.5, tileDepth: 1.5, tileClearance: 0.35, baseboardDepth: 1.2 });
const m = (cm) => cm / 100;
const box = (name, size, position, material) => { const mesh = new Mesh(new BoxGeometry(...size.map(m)), material); mesh.name = name; mesh.position.set(...position.map(m)); return mesh; };

function renderFrame(product, finishId) {
  const group = new Group(); const { widthCm: w, thicknessCm: d } = product.dimensions; const h = product.dimensions.baseHeightCm || product.dimensions.heightCm;
  const p = MULTIPLE_VISUAL_APPROXIMATIONS_CM.profileFace; const material = createMultipleMaterial('PAINTED_METAL', finishId);
  group.add(box('upright-left', [p, h, d], [-w / 2 + p / 2, h / 2, 0], material));
  group.add(box('upright-right', [p, h, d], [w / 2 - p / 2, h / 2, 0], material));
  group.add(box('rail-bottom', [w - p * 2, p, d], [0, p / 2, 0], material));
  group.add(box('rail-top', [w - p * 2, p, d], [0, h - p / 2, 0], material));
  return group;
}
function renderDoorPart(product, descriptor, finishId) {
  const group = new Group(); const v = descriptor.visual; const p = MULTIPLE_VISUAL_APPROXIMATIONS_CM.profileFace;
  const material = createMultipleMaterial(v.materialRole, finishId); const w = v.widthCm; const h = v.heightCm; const d = product.dimensions.thicknessCm;
  if (descriptor.componentRole === 'DOOR_FRAME_LEFT') group.add(box('door-frame-left', [p, h, d], [-w / 2 + p / 2, h / 2, 0], material));
  else if (descriptor.componentRole === 'DOOR_FRAME_RIGHT') group.add(box('door-frame-right', [p, h, d], [w / 2 - p / 2, h / 2, 0], material));
  else if (descriptor.componentRole === 'DOOR_FRAME_TOP') group.add(box('door-frame-top', [w - p * 2, p, d], [0, h - p / 2, 0], material));
  else if (descriptor.componentRole === 'DOOR_LEAF') {
    const leaf = box('door-leaf', [w - p * 2.5, h - p * 1.5, v.materialRole === 'GLASS' ? 0.4 : 3], [0, (h - p) / 2, 0], material);
    leaf.position.x = m(v.swing === 'LEFT' ? p / 2 : -p / 2); group.add(leaf);
  } else if (descriptor.componentRole === 'DOOR_HINGES') {
    const side = v.swing === 'LEFT' ? -1 : 1; for (const y of [h * 0.25, h * 0.75]) group.add(box(`hinge-${y}`, [1.2, 5, 1.2], [side * (w / 2 - p), y, d / 2], material));
  } else group.add(box('door-hardware', [2.5, 2.5, 6], [(v.swing === 'LEFT' ? 1 : -1) * w * 0.32, h * 0.52, d / 2], material));
  return group;
}
function renderGrowth(product, descriptor, finishId) {
  const group = new Group(); const v = descriptor.visual; const p = MULTIPLE_VISUAL_APPROXIMATIONS_CM.profileFace; const y = v.baseHeightCm;
  const material = createMultipleMaterial('PAINTED_METAL', finishId);
  group.add(box('growth-left', [p, v.heightCm, product.dimensions.thicknessCm], [-v.widthCm / 2 + p / 2, y + v.heightCm / 2, 0], material));
  group.add(box('growth-right', [p, v.heightCm, product.dimensions.thicknessCm], [v.widthCm / 2 - p / 2, y + v.heightCm / 2, 0], material));
  group.add(box('growth-top', [v.widthCm - p * 2, p, product.dimensions.thicknessCm], [0, y + v.heightCm - p / 2, 0], material)); return group;
}
function renderColumn(product, descriptor, finishId) {
  const group = new Group(); const v = descriptor.visual; const size = v.type === 'JUNCTION' ? 6 : 8; const side = v.side === 'LEFT' ? -1 : 1;
  group.add(box('column', [size, v.heightCm, size], [side * (product.dimensions.widthCm / 2 + size / 2), v.heightCm / 2, 0], createMultipleMaterial('PAINTED_METAL', finishId))); return group;
}
function renderCableTray(product, descriptor, finishId) {
  const group = new Group(); const v = descriptor.visual; const side = v.side === 'LEFT' ? -1 : 1;
  group.add(box('wall-cable-tray', [5, v.heightCm, 4], [side * (product.dimensions.widthCm / 2 + 2.5), v.heightCm / 2, product.dimensions.thicknessCm / 2], createMultipleMaterial('PAINTED_METAL', finishId))); return group;
}
function renderBaseboard(product, finishId) {
  const group = new Group(); const c = product.composition; const p = MULTIPLE_VISUAL_APPROXIMATIONS_CM;
  group.add(box('baseboard-cover', [product.dimensions.widthCm - p.profileFace * 2, c.baseboardHeightCm, p.baseboardDepth],
    [0, c.baseboardHeightCm / 2, product.dimensions.thicknessCm / 2], createMultipleMaterial('PAINTED_METAL', finishId)));
  return group;
}
function renderTile(product, descriptor, finishId) {
  const group = new Group(); const v = descriptor.visual; const p = MULTIPLE_VISUAL_APPROXIMATIONS_CM;
  group.add(box('tile-face', [product.dimensions.widthCm - p.profileFace * 2 - p.tileClearance, v.heightCm - p.tileClearance, v.visualThicknessCm ?? p.tileDepth],
    [0, v.positionYcm + v.heightCm / 2, 0], createMultipleMaterial(v.materialRole, finishId)));
  return group;
}
export function renderMultipleProduct(product) {
  const root = new Group(); root.name = 'MULTIPLE_PRODUCT';
  for (const descriptor of product.parts) {
    const finishId = product.config.components?.[descriptor.componentKey]?.finish || null;
    const component = descriptor.componentRole === 'FRAME' ? renderFrame(product, finishId)
      : descriptor.componentRole === 'BASEBOARD' ? renderBaseboard(product, finishId)
      : descriptor.componentRole.startsWith('DOOR_') ? renderDoorPart(product, descriptor, finishId)
      : descriptor.componentRole === 'GROWTH_MODULE' ? renderGrowth(product, descriptor, finishId)
      : descriptor.componentRole.startsWith('COLUMN_') ? renderColumn(product, descriptor, finishId)
      : descriptor.componentRole === 'CABLE_TRAY' ? renderCableTray(product, descriptor, finishId)
      : renderTile(product, descriptor, finishId);
    component.name = `MULTIPLE_${descriptor.componentKey}`;
    Object.assign(component.userData, { componentKey: descriptor.componentKey, componentRole: descriptor.componentRole,
      description: descriptor.commercial.description, codigoPT: descriptor.commercial.code,
      commercialReference: descriptor.commercial.reference || null,
      commercialStatus: descriptor.commercial.code ? 'RESOLVED' : 'PENDING',
      commercialDiagnostics: descriptor.commercial.diagnostics || descriptor.commercial.resolution?.diagnostics || [],
      commercialMaterial: descriptor.commercial.material || descriptor.visual.materialRole || null,
      commercialFinish: descriptor.commercial.finish || null,
      commercialPrice: descriptor.commercial.price ?? null, commercialCurrency: descriptor.commercial.currency || null,
      materialRole: descriptor.visual.materialRole, tileType: descriptor.visual.tileType || null,
      doorSwing: descriptor.visual.swing || null, columnType: descriptor.visual.type || null, finishId });
    root.add(component);
  }
  return root;
}
export function disposeMultipleComponent(component) {
  component?.traverse?.((node) => { node.geometry?.dispose?.(); if (Array.isArray(node.material)) node.material.forEach((x) => x?.dispose?.()); else node.material?.dispose?.(); });
}
