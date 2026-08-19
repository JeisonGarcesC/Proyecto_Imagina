// src/mepal/kuoAVDoble/factory/createKuoAVDobleInstance.js
// ─────────────────────────────────────────────────────────────────────────────
// Factory para PUESTO DOBLE KUO AV.
// Crea el contenedor THREE.Group raíz con kind='KUO_AV_DOBLE_ASSEMBLY',
// carga las mallas procedurales y GLBs físicos reales y genera el BOM.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { buildKuoAVDoble } from '../builder/KuoAVDobleBuilder.js';
import { createSurfaceMesh } from '../../../factories/surfaceFactory.js';

export async function createKuoAVDobleInstance({
  config,
  loadGlb = null,
  api = null,
  country = 'CO',
  transformOverrides = null,
  parent = null,
} = {}) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('createKuoAVDobleInstance: se requiere un objeto de configuración.');
  }

  const built = buildKuoAVDoble(config);
  if (!built || !Array.isArray(built.parts)) {
    throw new Error('createKuoAVDobleInstance: el builder no produjo partes válidas.');
  }

  const { groupId, groupName, parts, dimMm, config: effectiveConfig, bom } = built;

  const assemblyGroup = new THREE.Group();
  const instanceId =
    config.instanceId ||
    `KUOAVD_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  const effectiveGroupId = config.groupId || instanceId;
  assemblyGroup.name = `KUO_AV_DOBLE_${instanceId}`;

  assemblyGroup.userData = {
    isAssemblyRoot: true,
    kind: 'KUO_AV_DOBLE_ASSEMBLY',
    type: 'assembly',
    instanceId,
    groupId: effectiveGroupId,
    groupName,
    anchoMm: dimMm.width,
    profundidadMm: dimMm.depth,
    alturaMm: dimMm.height,
    thickMm: dimMm.thick,
    config: {
      ...effectiveConfig,
      instanceId,
      groupId: effectiveGroupId,
    },
    dimMm,
    bom,
    source: 'Kuo AVDoble',
    removable: true,
    selectable: true,
    rotatable: true,
    draggable: true,
    country,
  };

  // Carga y creación de submallas
  for (const part of parts) {
    if (part.modelKind === 'logical') {
      // Componente lógico / BOM Only (ej. DPBK06)
      continue;
    }

    let partObj = null;

    if (part.modelKind === 'procedural' && part.type === 'superficie') {
      partObj = createSurfaceMesh({
        widthM: part.proceduralParams.widthMm / 1000,
        depthM: part.proceduralParams.depthMm / 1000,
        thicknessM: part.proceduralParams.thickMm / 1000,
        color: part.color || '#dedede',
      });
    } else if (part.modelKind === 'procedural' && part.type === 'accesorio') {
      // Baldosa divisoria procedural
      const geo = new THREE.BoxGeometry(
        part.proceduralParams.widthMm / 1000,
        part.proceduralParams.heightMm / 1000,
        part.proceduralParams.thickMm / 1000
      );
      const mat = new THREE.MeshStandardMaterial({
        color: 0x4a5568,
        roughness: 0.7,
        metalness: 0.1,
      });
      partObj = new THREE.Mesh(geo, mat);
    } else if (part.modelKind === 'glb' && part.glb) {
      if (typeof loadGlb === 'function') {
        const rawPath = part.glb;
        const encodedPath = encodeURI(rawPath);
        const fileName = rawPath.split('/').pop();
        const candidatePaths = [
          rawPath,
          encodedPath,
          `/assets/models/Kuo AV/Pantalla Vidrio/${fileName}`,
          `/assets/models/Kuo%20AV/Pantalla%20Vidrio/${fileName}`,
          `/assets/models/Kuo AV/Pantalla FMT/${fileName}`,
          `/assets/models/Kuo AV/Puesto Perimetral/${fileName}`,
          `/assets/models/Kuo%20AV/Puesto%20Perimetral/${fileName}`,
          `/assets/models/Kuo AV/Puesto Doble/${fileName}`,
          `/assets/models/Kuo%20AV/Puesto%20Doble/${fileName}`,
          `/assets/models/Kuo AV/${fileName}`,
          `/assets/models/Kuo%20AV/${fileName}`,
        ];

        try {
          const loaded = await loadGlb(candidatePaths);
          const gltfScene = loaded?.scene || loaded?.object || loaded || null;
          if (gltfScene) {
            partObj = gltfScene.clone ? gltfScene.clone(true) : gltfScene;

            // Variantes de color en parales, estructura y kit fuente
            if (part.colorVariante) {
              const hex =
                part.colorVariante === 'Blanco' || part.colorVariante === 'Anodizado'
                  ? 0xffffff
                  : part.colorVariante === 'Gris'
                  ? 0x707070
                  : part.colorVariante === 'Negro'
                  ? 0x1e1e1e
                  : typeof part.colorVariante === 'string' && part.colorVariante.startsWith('#')
                  ? parseInt(part.colorVariante.slice(1), 16)
                  : 0xffffff;
              partObj.traverse((child) => {
                if (child.isMesh && child.material) {
                  child.material = child.material.clone();
                  child.material.color.setHex(hex);
                  child.material.roughness = 0.35;
                  child.material.metalness = 0.1;
                }
              });
            }
          }
        } catch (err) {
          console.warn(`[createKuoAVDobleInstance] Error cargando GLB ${part.glb}:`, err);
        }
      }

      // Proxy fallback SOLO si falló totalmente la carga
      if (!partObj) {
        console.warn(`[createKuoAVDobleInstance] No se pudo cargar GLB para ${part.name} (${part.codigo})`);
      }
    }

    if (partObj) {
      partObj.name = part.name || part.codigo || part.partId;
      if (part.position) partObj.position.fromArray(part.position);
      if (part.rotation) partObj.rotation.fromArray(part.rotation);
      if (part.scale) partObj.scale.fromArray(part.scale);

      const partInstanceId = `${instanceId}__${part.partId}`;
      const partType = part.type || 'GLB_PART';
      const partMaterialBase =
        partType === 'superficie'
          ? 'Madera'
          : partType === 'pantalla'
          ? 'Melamina'
          : 'Metal';
      const partGenerico =
        partType === 'superficie'
          ? 'SUPERFICIE'
          : partType === 'pantalla'
          ? 'PANTALLA'
          : partType === 'accesorio'
          ? 'ACCESORIO'
          : 'ESTRUCTURA';

      partObj.userData = {
        isPartRoot: true,
        parentAssemblyId: instanceId,
        instanceId: partInstanceId,
        groupId: effectiveGroupId,
        groupName,
        kind: partType === 'superficie' ? 'superficie' : partType,
        type: partType,
        role: part.role,
        codigo: part.codigo,
        code: part.codigo,
        codigoPT: part.codigo,
        name: part.name,
        description: part.name,
        lookupTag: part.lookupTag,
        componentId: part.partId,
        selectable: true,
        materialBase: partMaterialBase,
        generico: partGenerico,
      };

      partObj.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;
          if (child.material) {
            child.material.depthWrite = true;
            child.material.depthTest = true;
            child.material.side = THREE.DoubleSide;
            if (part.type === 'vertebra') {
              child.material.transparent = false;
              child.material.opacity = 1.0;
            }
          }
        }
        child.userData = {
          ...child.userData,
          parentAssemblyId: instanceId,
          instanceId: partInstanceId,
          groupId: effectiveGroupId,
          groupName,
          kind: partType === 'superficie' ? 'superficie' : partType,
          type: partType,
          role: part.role,
          codigo: part.codigo,
          code: part.codigo,
          codigoPT: part.codigo,
          lookupTag: part.lookupTag,
          componentId: part.partId,
          name: part.name,
          description: part.name,
          selectable: true,
          materialBase: partMaterialBase,
          generico: partGenerico,
        };
      });

      assemblyGroup.add(partObj);

      console.log(`[KUO DOBLE COMPONENT] Añadido GLB real: ${part.name} (${part.role}) en pos:`, part.position);
    }
  }

  // Cota fija en el piso
  assemblyGroup.position.set(0, 0, 0);
  assemblyGroup.updateMatrixWorld(true);

  const partRecord = {
    id: instanceId,
    obj: assemblyGroup,
    kind: 'KUO_AV_DOBLE_ASSEMBLY',
    type: 'assembly',
    instanceId,
    groupId: effectiveGroupId,
    config: assemblyGroup.userData.config,
    bom,
  };

  return {
    object: assemblyGroup,
    metadata: assemblyGroup.userData,
    partRecord,
    built,
  };
}

export default createKuoAVDobleInstance;
