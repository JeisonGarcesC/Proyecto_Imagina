import { renderCritterium8FrameAssembly3D } from '../renderers/Critterium8FrameRenderer3D.js';

export async function buildCritterium8Frame3D({ frame, composition, parts = [], layout } = {}) {
  void frame;
  void composition;
  if (!layout || !Array.isArray(layout.placements)) throw new Error('CRITTERIUM8_LAYOUT_REQUIRED');
  return renderCritterium8FrameAssembly3D({ parts, layout });
}
