// src/mepal/kuoAV/factory/createKuoAVInstance.js
// ─────────────────────────────────────────────────────────────────────────────
// Factory para KUO AV - Superficie Perimetral.
// Transforma el árbol de Parts generado por buildKuoAV en una instancia 3D
// estructurada (THREE.Group) compatible con el sistema de escenas, BOM,
// rotación, selección, copiado y pegado de IMAGINA.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { buildKuoAV } from '../builder/KuoAVBuilder.js';
import { createSurfaceMesh } from '../../../factories/surfaceFactory.js';
import { applyKuoAVAssetTransform } from '../transform/kuoAVAssetTransforms.js';
import { KUO_AV_PART_ROLES, KUO_AV_PART_TYPES } from '../parts/kuoAVParts.js';
import { buildKuoAVBOM } from '../bom/kuoAVBOMCatalog.js';

function cloneAsset(source) {
  const clone = source.clone ? source.clone(true) : source;
  clone.traverse?.((child) => {
    if (!child.isMesh) return;
    if (child.geometry?.clone) child.geometry = child.geometry.clone();
    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material?.clone?.() || material);
    } else if (child.material?.clone) {
      child.material = child.material.clone();
    }
  });
  return clone;
}

function forEachMaterial(object, callback) {
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of materials) {
    if (material) callback(material);
  }
}

/**
 * Aplica transformaciones guardadas (posición, rotación, escala) a un Object3D.
 */
function applyTransformOverrides(object, transformOverrides) {
  if (!object || !transformOverrides) return;
  if (Array.isArray(transformOverrides.position)) {
    object.position.fromArray(transformOverrides.position);
  }
  if (Array.isArray(transformOverrides.quaternion)) {
    object.quaternion.fromArray(transformOverrides.quaternion).normalize();
  }
  if (Array.isArray(transformOverrides.scale)) {
    object.scale.fromArray(transformOverrides.scale);
  }
  object.updateMatrixWorld?.(true);
}

/**
 * Genera una malla de soporte/proxy visual únicamente si un modelo GLB falla en cargar.
 */
function createPartProxyMesh(part) {
  const widthM = (part.dimMm?.widthMm || 50) / 1000;
  const heightM = (part.dimMm?.heightMm || part.dimMm?.thickMm || 50) / 1000;
  const depthM = (part.dimMm?.depthMm || 50) / 1000;

  const geo = new THREE.BoxGeometry(widthM, heightM, depthM);
  const mat = new THREE.MeshStandardMaterial({
    color: part.type === 'columna' ? 0x333333 : part.type === 'viga' ? 0x555555 : 0x777777,
    roughness: 0.5,
    metalness: 0.2,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Instancia un ensamble de KUO AV - Superficie Perimetral.
 *
 * @param {Object} options
 * @param {Object} options.config - Configuración del producto
 * @param {Function} [options.loadGlb] - Función asíncrona inyectada para cargar GLBs
 * @param {Object} [options.api] - API de ThreeCanvas (opcional)
 * @param {string} [options.country='CO'] - Divisa/país activo
 * @param {Object} [options.transformOverrides] - Transformaciones a aplicar
 * @param {THREE.Object3D} [options.parent] - Grupo o escena padre
 * @returns {Promise<Object>} { object, metadata, partRecord, built }
 */
export async function createKuoAVInstance({
  config,
  loadGlb = null,
  api = null,
  country = 'CO',
  transformOverrides = null,
  parent = null,
} = {}) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('createKuoAVInstance: se requiere un objeto de configuración.');
  }

  // 1. Ejecutar el Builder determinista
  const built = buildKuoAV(config);
  if (!built || !Array.isArray(built.parts)) {
    throw new Error('createKuoAVInstance: el builder no produjo una estructura de partes válida.');
  }

  const { groupId, groupName, parts, dimMm } = built;

  // 2. Crear el contenedor raíz de la instancia (THREE.Group)
  const assemblyGroup = new THREE.Group();

  const instanceId =
    config.instanceId ||
    `KUOAV_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  // groupId único por cada mesa individual para permitir selección y arrastre 100% independiente
  const effectiveGroupId = config.groupId || instanceId;

  assemblyGroup.name = `KUO_AV_${instanceId}`;

  // 3. Empaquetar el desglose de partes con códigos CET para el BOM y cotizador
  const kuoAVParts = buildKuoAVBOM(built);

  // 4. Configuración completa normalizada y preservada para reconstrucción exacta
  const preservedConfig = {
    ...built.config,
    instanceId,
    groupId: effectiveGroupId,
    groupName,
  };

  const metadata = {
    kind: 'KUO_AV_ASSEMBLY',
    isPartRoot: true,
    groupId: effectiveGroupId,
    groupName,
    instanceId,
    config: preservedConfig,
    dimMm,
    kuoAVParts,
    bom: kuoAVParts,
  };

  assemblyGroup.userData = {
    ...(assemblyGroup.userData || {}),
    ...metadata,
  };

  // 5. Construcción y ensamblaje de piezas en 3D
  for (const part of parts) {
    // Si la pieza es de tipo lógico (ej: DPBK06 botonera sin modelo 3D), no genera objeto 3D
    if (part.model?.kind === 'logical') {
      continue;
    }

    const posX = (part.position?.x || 0) / 1000;
    const posY = (part.position?.y || 0) / 1000;
    const posZ = (part.position?.z || 0) / 1000;

    let partObject = null;

    if (part.type === 'superficie' && part.model?.kind === 'procedural') {
      // Superficie perimetral paramétrica (BoxGeometry procedural con espesor real)
      const widthM = (part.dimMm?.widthMm || 1200) / 1000;
      const depthM = (part.dimMm?.depthMm || 600) / 1000;
      const thickM = (part.dimMm?.thickMm || 30) / 1000;

      partObject = createSurfaceMesh({
        widthM,
        depthM,
        thicknessM: thickM,
        color: 0xe0e0e0,
      });

      partObject.name = `KUO_AV_SURFACE_${instanceId}`;
      partObject.userData = {
        ...(partObject.userData || {}),
        isSurface: true,
        isKuoSurface: true,
        kind: 'KUO_AV_SURFACE',
        surfaceWidthMm: part.dimMm?.widthMm || 1200,
        surfaceDepthMm: part.dimMm?.depthMm || 600,
        surfaceThickMm: part.dimMm?.thickMm || 30,
        parentAssemblyId: instanceId,
        groupId: effectiveGroupId,
        code: part.code,
        role: part.role,
      };
    } else if (part.model?.kind === 'glb' && typeof loadGlb === 'function' && part.model?.src) {
      const isVertebra = part.code === 'KUAC650000' || part.type === 'vertebra';
      if (isVertebra) {
        console.log('[KUO VERTEBRA DEBUG] LOAD REQUEST', {
          path: part.model.src,
          vertebraLateral: config.vertebraLateral,
          codigo: part.code,
          glb: part.model.src,
          position: [posX, posY, posZ],
          instanceId,
        });
      }

      // Carga de modelos GLB reales de CET
      try {
        const baseSrc = part.model.src;
        const fileName = baseSrc.split('/').pop();
        const candidatePaths = [
          baseSrc,
          `/assets/models/Kuo AV/Puesto Perimetral/${fileName}`,
          encodeURI(`/assets/models/Kuo AV/Puesto Perimetral/${fileName}`),
          `/assets/models/Kuo%20AV/Puesto%20Perimetral/${fileName}`,
          `/assets/models/Kuo AV/${fileName}`,
        ];
        const loaded = await loadGlb(candidatePaths);
        const glbScene = loaded?.scene || loaded?.object || loaded || null;
        if (glbScene) {
          partObject = cloneAsset(glbScene);
        }
      } catch (err) {
        console.warn(`[createKuoAVInstance] Error al cargar GLB "${part.model.src}". Usando proxy visual:`, err.message);
      }

      // Si el GLB falló, usar proxy temporal
      if (!partObject) {
        partObject = createPartProxyMesh(part);
      }
    } else if (part.model?.kind === 'procedural') {
      partObject = createPartProxyMesh(part);
    }

    if (partObject) {
      const isVertebra = part.code === 'KUAC650000' || part.type === 'vertebra';

      // Asegurar que las mallas y materiales sean visibles, sólidos y proyecten sombras
      partObject.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;
          forEachMaterial(child, (material) => {
            material.depthWrite = true;
            material.depthTest = true;
            material.side = THREE.DoubleSide;
            if (isVertebra) {
              material.transparent = false;
              material.opacity = 1.0;
              material.needsUpdate = true;
            }
          });
        }
      });

      // Aplicar transformación base controlada (rotación y escala)
      applyKuoAVAssetTransform(partObject, part);

      partObject.position.set(posX, posY, posZ);

      // Metadatos de sub-parte para raycasting, selección y BOM
      partObject.userData = {
        ...(partObject.userData || {}),
        parentAssemblyId: instanceId,
        instanceId,
        groupId: effectiveGroupId,
        code: part.code,
        lookupTag: part.lookupTag || part.logicalCode,
        codigoCET: part.code,
        role: part.role,
        partType: part.type,
        logicalCode: part.logicalCode,
        isSubPart: true,
      };

      assemblyGroup.add(partObject);

      if (isVertebra) {
        assemblyGroup.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(partObject);
        let firstMat = null;
        partObject.traverse((c) => {
          if (c.isMesh && c.material && !firstMat) firstMat = c.material;
        });

        console.log('[KUO VERTEBRA DEBUG] MATERIAL & RENDER STATE', {
          visible: partObject.visible,
          position: [partObject.position.x * 1000, partObject.position.y * 1000, partObject.position.z * 1000],
          rotation: [partObject.rotation.x, partObject.rotation.y, partObject.rotation.z],
          scale: [partObject.scale.x, partObject.scale.y, partObject.scale.z],
          materialVisible: firstMat?.visible ?? true,
          materialOpacity: firstMat?.opacity ?? 1,
          materialTransparent: firstMat?.transparent ?? false,
          materialDepthWrite: firstMat?.depthWrite ?? true,
          materialDepthTest: firstMat?.depthTest ?? true,
          materialSide: firstMat?.side === THREE.DoubleSide ? 'DoubleSide' : firstMat?.side,
          renderOrder: partObject.renderOrder,
          parent: partObject.parent?.name || 'assemblyGroup',
          parentVisible: partObject.parent?.visible ?? true,
          worldBoundingBox: {
            min: { x: Number((box.min.x * 1000).toFixed(1)), y: Number((box.min.y * 1000).toFixed(1)), z: Number((box.min.z * 1000).toFixed(1)) },
            max: { x: Number((box.max.x * 1000).toFixed(1)), y: Number((box.max.y * 1000).toFixed(1)), z: Number((box.max.z * 1000).toFixed(1)) },
            center: {
              x: Number((((box.min.x + box.max.x) / 2) * 1000).toFixed(1)),
              y: Number((((box.min.y + box.max.y) / 2) * 1000).toFixed(1)),
              z: Number((((box.min.z + box.max.z) / 2) * 1000).toFixed(1)),
            },
          },
        });
      }

      if (part.role === KUO_AV_PART_ROLES.GROMMET || part.type === KUO_AV_PART_TYPES.GROMMET || part.code === 'LKAC250000') {
        console.log('[KUO GROMMET FINAL THREE]', {
          position: [partObject.position.x * 1000, partObject.position.y * 1000, partObject.position.z * 1000],
          rotation: [partObject.rotation.x, partObject.rotation.y, partObject.rotation.z],
          scale: [partObject.scale.x, partObject.scale.y, partObject.scale.z],
        });
      }
    }
  }

  // 6. Aplicar transformaciones si es una copia o restauración
  if (transformOverrides) {
    applyTransformOverrides(assemblyGroup, transformOverrides);
  }

  // 7. Vincular al padre si fue proporcionado
  if (parent && assemblyGroup.parent !== parent) {
    parent.add(assemblyGroup);
  }

  assemblyGroup.updateMatrixWorld(true);

  return {
    object: assemblyGroup,
    metadata,
    partRecord: {
      code: built.config.logicalCode || `KUO_AV_${groupId}`,
      obj: assemblyGroup,
    },
    built,
  };
}

export default createKuoAVInstance;
