import { ExtrudeGeometry, Mesh, Shape } from 'three';
import { addBox, createNativeRoot, rectangleShape } from './vetroNativeUtils.js';
import { createVetroNativeMaterial } from './vetroNativeMaterials.js';
import { VETRO_MATERIAL_ROLES } from './vetroNativeMaterials.js';
import { approximationDiagnostics, approximationValue } from './vetroNativeConstants.js';

export function createVetroAccessoryGeometry(product) {
  const variant = product.commercial.variant;
  const documented = product.dimensions.documented;
  const root = createNativeRoot('VETRO_NATIVE_ACCESSORY');
  if (variant === 'DOOR_FLOOR_STOP_HALF_MOON') {
    const [width, height] = approximationValue('DOOR_FLOOR_STOP_VISUAL_SIZE_MM').map((mm) => mm / 1000);
    const radius = width / 2;
    const shape = new Shape();
    shape.moveTo(-radius, 0);
    shape.lineTo(radius, 0);
    shape.absarc(0, 0, radius, 0, Math.PI, false);
    const geometry = new ExtrudeGeometry(shape, { depth: height, curveSegments: 20, steps: 1,
      bevelEnabled: true, bevelSegments: 2, bevelThickness: 0.002, bevelSize: 0.002 });
    // The profile is formed in XY; rotate it onto the XZ floor plane.
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0.002, radius / 2);
    const body = new Mesh(geometry, createVetroNativeMaterial(VETRO_MATERIAL_ROLES.HARDWARE));
    body.name = 'DOOR_FLOOR_STOP_HALF_MOON_BODY';
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData = { componentRole: 'DOOR_FLOOR_STOP', materialRole: VETRO_MATERIAL_ROLES.HARDWARE, visualSource: 'NATIVE' };
    root.add(body);
    const approximationFlags = ['DOOR_FLOOR_STOP_VISUAL_SIZE_MM'];
    return { root, approximationFlags, diagnostics: approximationDiagnostics(approximationFlags), shape2D: null };
  }
  let sizeMm;
  let approximationFlags = [];
  if (documented) {
    sizeMm = [Number(documented.width) * 10, Number(documented.height) * 10, Number(documented.depth) * 10];
  } else if (variant === 'DOOR_LOCK_REPLACEMENT') {
    sizeMm = approximationValue('DOOR_LOCK_VISUAL_SIZE_MM');
    approximationFlags = ['DOOR_LOCK_VISUAL_SIZE_MM'];
  } else {
    sizeMm = approximationValue('LEVELING_KIT_VISUAL_SIZE_MM');
    approximationFlags = ['LEVELING_KIT_VISUAL_SIZE_MM'];
  }
  const materialRole = documented ? VETRO_MATERIAL_ROLES.HARDWARE : variant === 'DOOR_LOCK_REPLACEMENT' ? VETRO_MATERIAL_ROLES.HARDWARE : VETRO_MATERIAL_ROLES.LIGHT_GRAY_PLASTIC;
  addBox(root, { name: 'ACCESSORY_BODY', sizeMm, centerMm: [0, sizeMm[1] / 2, 0], materialRole });
  if (variant === 'FLOATING_JOIN_90' || variant === 'FLOATING_JOIN_T') {
    addBox(root, { name: 'ACCESSORY_BRANCH', sizeMm: [sizeMm[2], sizeMm[1], sizeMm[0] / 2], centerMm: [0, sizeMm[1] / 2, sizeMm[2] / 2], materialRole });
  }
  return { root, approximationFlags, diagnostics: approximationDiagnostics(approximationFlags), shape2D: rectangleShape('VETRO_ACCESSORY', sizeMm[0], sizeMm[2]) };
}
