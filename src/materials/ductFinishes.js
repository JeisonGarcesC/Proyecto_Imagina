import * as THREE from 'three';

// Colores normativos de ductos MePal / Carvajal:
// Cimbra (acceso para cableado): Gris oscuro grafito / carbón mate (visible tanto en estructura oscura como clara)
export const DUCT_CIMBRA_COLOR = 0x3d4147;
// Placas (soportes y fijaciones): Gris
export const DUCT_PLATE_COLOR = 0x828282;

export function createDuctCimbraMaterial() {
  return new THREE.MeshStandardMaterial({
    color: DUCT_CIMBRA_COLOR,
    roughness: 0.85,
    metalness: 0.05,
    name: 'DUCTO_CIMBRA_MAT',
    side: THREE.DoubleSide,
  });
}

export function createDuctPlateMaterial() {
  return new THREE.MeshStandardMaterial({
    color: DUCT_PLATE_COLOR,
    roughness: 0.55,
    metalness: 0.25,
    name: 'DUCTO_PLATE_MAT',
    side: THREE.DoubleSide,
  });
}

/**
 * Determina si un objeto 3D o metadata corresponde a cualquiera de los 4 tipos de ductos:
 * 1. Ducto cableado individual (horizontal)
 * 2. Ducto cableado doble (horizontal)
 * 3. Ducto a piso (individual o doble)
 * 4. Ducto a techo (individual o doble)
 */
export function isDuctObject(obj, meta = {}) {
  if (!obj) return false;
  const kind = String(obj.userData?.kind || meta?.type || obj.type || '').trim();
  const category = String(meta?.category || obj.userData?.meta?.category || '').trim();
  const role = String(obj.userData?.componentRole || obj.userData?.role || meta?.role || '').trim().toUpperCase();
  const name = String(obj.name || '').trim();
  const code = String(obj.userData?.code || meta?.code || '').trim();
  const modelSrc = String(obj.userData?.modelSrc || meta?.model?.src || '').trim();

  if (kind === 'ducto' || kind === 'ductoPiso' || kind === 'ductoTecho') return true;
  if (category === 'ductos' || category === 'ductos-a-piso' || category === 'ductos-a-techo') return true;
  if (role === 'DUCT' || role === 'FLOOR_DUCT' || role === 'CEILING_DUCT') return true;
  if (
    name.startsWith('CEILING_DUCT_') ||
    name.startsWith('FLOOR_DUCT_') ||
    name.startsWith('KONCISA_DUCT_') ||
    name.startsWith('DUCTO_')
  ) {
    return true;
  }
  if (/^2KSO(333|325|370|369|334|327|346|345|332|348|367|368|326|349|365|366)/i.test(code)) return true;
  if (/2KSO(333|325|370|369|334|327|346|345|332|348|367|368|326|349|365|366)/i.test(modelSrc)) return true;
  if (/LKSO(140000|150000)/i.test(modelSrc) || /LKSO(140000|150000)/i.test(code)) return true;
  return false;
}

/**
 * Resuelve la categoría del ducto: 'FLOOR', 'CEILING', o 'HORIZONTAL'.
 */
export function getDuctCategory(obj, meta = {}) {
  if (!obj) return null;
  const kind = String(obj.userData?.kind || meta?.type || obj.type || '').trim();
  const category = String(meta?.category || obj.userData?.meta?.category || '').trim();
  const role = String(obj.userData?.componentRole || obj.userData?.role || meta?.role || '').trim().toUpperCase();
  const name = String(obj.name || '').trim();
  const code = String(obj.userData?.code || meta?.code || '').trim();
  const modelSrc = String(obj.userData?.modelSrc || meta?.model?.src || '').trim();

  if (role === 'FLOOR_DUCT' || kind === 'ductoPiso' || category === 'ductos-a-piso' || name.startsWith('FLOOR_DUCT_')) return 'FLOOR';
  if (/2KSO(333000|325000|370000|369000)/i.test(code) || /2KSO(333000|325000|370000|369000)/i.test(modelSrc)) {
    return 'FLOOR';
  }

  if (role === 'CEILING_DUCT' || kind === 'ductoTecho' || category === 'ductos-a-techo' || name.startsWith('CEILING_DUCT_')) return 'CEILING';
  if (/2KSO(334000|327000)/i.test(code) || /2KSO(334000|327000)/i.test(modelSrc)) {
    return 'CEILING';
  }

  if (role === 'DUCT' || kind === 'ducto' || category === 'ductos' || name.startsWith('KONCISA_DUCT_') || name.startsWith('DUCTO_') || /LKSO(140000|150000)/i.test(modelSrc) || /LKSO(140000|150000)/i.test(code)) {
    return 'HORIZONTAL';
  }
  if (
    /2KSO(346000|345000|332000|348000|367000|368000|326000|349000|365000|366000)/i.test(code) ||
    /2KSO(346000|345000|332000|348000|367000|368000|326000|349000|365000|366000)/i.test(modelSrc)
  ) {
    return 'HORIZONTAL';
  }

  return null;
}

/**
 * Clasifica un mesh específico dentro de un ducto:
 * Retorna: 'CIMBRA' | 'PLATE' | 'BODY' | 'IGNORE'
 */
export function classifyDuctMesh(mesh, ductCategory) {
  if (!mesh?.isMesh || !mesh.geometry) return 'BODY';

  // Si el material es transparente (marcadores de corte pasacable en GLB), ignorar
  const matName = String(mesh.material?.name || '').toLowerCase();
  if (matName.includes('transparency')) return 'IGNORE';

  // 1. Clasificación por nombres explícitos (en modelos nativos y GLB)
  const name = String(mesh.name || '').toLowerCase();
  if (
    name.includes('cimbra') || matName.includes('cimbra') ||
    name.includes('tapa-superior') || name.includes('tapa-frontal') ||
    name.includes('tapa-retorno') || name.includes('tapa-posterior') ||
    name.includes('ranura-central') || name.includes('tapa-labio') ||
    name.includes('tapa-nervio') || name.includes('cover') || matName.includes('cover') ||
    name.includes('acceso') || matName.includes('acceso') ||
    name.includes('ranura') || matName.includes('ranura') ||
    name.includes('slot') || matName.includes('slot') ||
    name.includes('linea') || matName.includes('linea')
  ) {
    return 'CIMBRA';
  }
  if (
    name.includes('placa') || matName.includes('placa') ||
    name.includes('soporte') || matName.includes('soporte') ||
    name.includes('clip') || matName.includes('clip') ||
    name.includes('cierre-fijacion') || name.includes('refuerzo') ||
    name.includes('plate') || matName.includes('plate') ||
    name.includes('bracket') || matName.includes('bracket') ||
    name.includes('grommet') || matName.includes('grommet') ||
    name.includes('collar') || matName.includes('collar') ||
    name.includes('flange') || matName.includes('flange')
  ) {
    return 'PLATE';
  }
  if (
    name.includes('bandeja') ||
    name.includes('pared') ||
    name.includes('riel') ||
    name.includes('faldon') ||
    name.includes('cierre-terminal') ||
    name.includes('caja-principal') ||
    name.includes('pestana')
  ) {
    return 'BODY';
  }

  // 2. Clasificación geométrica invariante (bounding box local del mesh)
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  if (!box) return 'BODY';

  const scaleX = Math.abs(mesh.scale?.x ?? 1);
  const scaleY = Math.abs(mesh.scale?.y ?? 1);
  const scaleZ = Math.abs(mesh.scale?.z ?? 1);

  const sx = Math.abs(box.max.x - box.min.x) * scaleX;
  const sy = Math.abs(box.max.y - box.min.y) * scaleY;
  const sz = Math.abs(box.max.z - box.min.z) * scaleZ;

  const rawDims = [sx, sy, sz].sort((a, b) => a - b);
  // Normalizar a metros tanto si la geometría viene en mm (largo > 10) como en metros
  const unitFactor = rawDims[2] > 10 ? 0.001 : 1.0;
  const [d0, d1, d2] = rawDims.map((v) => v * unitFactor);

  // Ignorar piezas minúsculas como tornillos o remaches insignificantes
  if (d2 < 0.030) return 'IGNORE';

  // DUCTO A PISO (sencillo y doble)
  if (ductCategory === 'FLOOR') {
    // Cimbra: listón vertical central [0.018, 0.060, 0.337] o [0.018, 0.060, 0.409]
    if (d0 >= 0.010 && d0 <= 0.035 && d1 >= 0.040 && d1 <= 0.085 && d2 >= 0.250 && d2 <= 0.450) {
      return 'CIMBRA';
    }
    // Placa base inferior: [0.024, 0.079..0.166, 0.500]
    if (d0 <= 0.035 && d2 >= 0.45 && d2 <= 0.65) {
      return 'PLATE';
    }
    // Placa collar superior de acople: [0.098, 0.082..0.169, 0.107]
    if (d2 <= 0.20 && d0 >= 0.06) {
      return 'PLATE';
    }
    // Columna vertical (cuerpo del ducto)
    if (d0 >= 0.07 && d2 >= 0.40) {
      return 'BODY';
    }
  }

  // DUCTO A TECHO (sencillo y doble)
  if (ductCategory === 'CEILING') {
    // Mástil vertical de 2.4 metros
    if (d2 >= 2.0) {
      // Cimbra: ranura vertical delantera estrecha [0.010, 0.100..0.200, 2.400]
      if (d0 <= 0.025) {
        return 'CIMBRA';
      }
      // Columna principal (cuerpo del ducto)
      return 'BODY';
    }
    // Placas de acople y anclaje a techo (d2 < 0.35m)
    if (d2 < 0.35) {
      return 'PLATE';
    }
  }

  // DUCTO HORIZONTAL CABLEADO (sencillo y doble, terminal e intermedio)
  if (ductCategory === 'HORIZONTAL') {
    // 1. Placas y clips de soporte / orificios grommet en extremos (longitud <= 280 mm)
    if (d2 <= 0.28 && (d0 <= 0.05 || (d0 <= 0.08 && d1 <= 0.16))) {
      return 'PLATE';
    }
    // 2. Cimbra: tapa central de acceso / franja / ranura longitudinal de cableado (delgada y alargada)
    if ((d0 <= 0.065 && d1 <= 0.180 && d2 >= 0.28) || (d0 >= 0.015 && d0 <= 0.075 && d1 <= 0.180 && d2 >= 0.28)) {
      return 'CIMBRA';
    }
    // 3. Bandeja y perfiles principales del ducto (largo >= 0.70m)
    if (d2 >= 0.70) {
      return 'BODY';
    }
  }

  return 'BODY';
}

/**
 * Recorre el objeto 3D del ducto y asigna los acabados normativos:
 * - Cimbras -> Negro mate (#1a1a1a), marcadas isDuctCimbra = true, isDuctProtectedPart = true
 * - Placas -> Gris (#828282), marcadas isDuctPlate = true, isDuctProtectedPart = true
 * - El cuerpo conserva su material original para recibir los acabados de pintura.
 */
export function applyDuctVisualMaterials(root, meta = {}) {
  if (!root) return;
  const ductCategory = getDuctCategory(root, meta);
  // Los ductos a piso y a techo conservan su material original íntegro del GLB (no se modifican)
  if (!ductCategory || ductCategory === 'FLOOR' || ductCategory === 'CEILING') return;

  const cimbraMat = createDuctCimbraMaterial();
  const plateMat = createDuctPlateMaterial();

  root.traverse((node) => {
    if (!node?.isMesh) return;

    // Resuelve la categoría del ducto para este nodo (en caso de sub-ductos como ducto a techo hijo)
    const effectiveCategory =
      node !== root && (node.userData?.kind || node.userData?.meta?.category)
        ? getDuctCategory(node, node.userData?.meta) || ductCategory
        : ductCategory;

    // Si ya fue clasificado previamente, actualizar visual si corresponde
    if (node.userData?.isDuctCimbra) {
      node.material = cimbraMat.clone();
      node.userData.__origMaterial = node.material;
      node.userData.isDuctProtectedPart = true;
      node.castShadow = true;
      node.receiveShadow = true;
      return;
    }
    if (node.userData?.isDuctPlate) {
      node.material = plateMat.clone();
      node.userData.__origMaterial = node.material;
      node.userData.isDuctProtectedPart = true;
      node.castShadow = true;
      node.receiveShadow = true;
      return;
    }

    const type = classifyDuctMesh(node, effectiveCategory);
    if (type === 'CIMBRA') {
      node.userData.isDuctCimbra = true;
      node.userData.isDuctProtectedPart = true;
      node.material = cimbraMat.clone();
      node.userData.__origMaterial = node.material;
      node.castShadow = true;
      node.receiveShadow = true;
    } else if (type === 'PLATE') {
      node.userData.isDuctPlate = true;
      node.userData.isDuctProtectedPart = true;
      node.material = plateMat.clone();
      node.userData.__origMaterial = node.material;
      node.castShadow = true;
      node.receiveShadow = true;
    } else if (type === 'BODY') {
      if (!node.userData.__origMaterial) {
        node.userData.__origMaterial = node.material;
      }
    }
  });
}
