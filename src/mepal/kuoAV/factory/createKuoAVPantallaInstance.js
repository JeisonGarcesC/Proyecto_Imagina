// src/mepal/kuoAV/factory/createKuoAVPantallaInstance.js
// ─────────────────────────────────────────────────────────────────────────────
// Factory para Pantallas KUO AV (Formica, Melamina, Tela, Vidrio Doble y Frontal Perimetral).
// Elemento independiente / flotante con acople inteligente a puestos.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

export const KUO_AV_PANTALLA_CATALOG = Object.freeze({
  FORMICA: {
    1200: { codigoPT: '22000116713', lookupTag: 'KUOPRIVACYPANEL_30_120-22008689', name: 'Pantalla Frontal 120cm Formica Altura Variable Kuo KUAC690000' },
    1500: { codigoPT: '22000116714', lookupTag: 'KUOPRIVACYPANEL_30_150-22008689', name: 'Pantalla Frontal 150cm Formica Altura Variable Kuo KUAC690000' },
    1650: { codigoPT: '22000116715', lookupTag: 'KUOPRIVACYPANEL_30_165-22008689', name: 'Pantalla Frontal 165cm Formica Altura Variable Kuo KUAC690000' },
  },
  MELAMINA: {
    1200: { codigoPT: '22000116716', lookupTag: 'KUOPRIVACYPANEL_30_120-22015138', name: 'Pantalla Frontal 120cm Melamínico Altura Variable Kuo KUAC700000' },
    1500: { codigoPT: '22000116821', lookupTag: 'KUOPRIVACYPANEL_30_150-22015138', name: 'Pantalla Frontal 150cm Melamínico Altura Variable Kuo KUAC700000' },
    1650: { codigoPT: '22000116822', lookupTag: 'KUOPRIVACYPANEL_30_165-22015138', name: 'Pantalla Frontal 165cm Melamínico Altura Variable Kuo KUAC700000' },
  },
  TELA: {
    1200: { codigoPT: '22000116710', lookupTag: 'KUOPRIVACYPANEL_30_120-22021827', name: 'Pantalla Frontal 120cm Acústica Altura Variable Kuo KUAC670000' },
    1500: { codigoPT: '22000116711', lookupTag: 'KUOPRIVACYPANEL_30_150-22021827', name: 'Pantalla Frontal 150cm Acústica Altura Variable Kuo KUAC670000' },
    1650: { codigoPT: '22000116712', lookupTag: 'KUOPRIVACYPANEL_30_165-22021827', name: 'Pantalla Frontal 165cm Acústica Altura Variable Kuo KUAC670000' },
  },
  VIDRIO: {
    1200: { codigoPT: '22000116695', lookupTag: 'KUOPRIVACYPANELGLASS_30_120-22006318', name: 'Pantalla Frontal 120cm Vidrio Laminado Altura Variable Kuo KUAC660000' },
    1500: { codigoPT: '22000116337', lookupTag: 'KUOPRIVACYPANELGLASS_30_150-22006318', name: 'Pantalla Frontal 150cm Vidrio Laminado Altura Variable Kuo KUAC660000' },
    1650: { codigoPT: '22000116696', lookupTag: 'KUOPRIVACYPANELGLASS_30_165-22006318', name: 'Pantalla Frontal 165cm Vidrio Laminado Altura Variable Kuo KUAC660000' },
  },
  FRONTAL_PERIMETRAL: {
    1200: { codigoPT: '22000118213', lookupTag: 'KUOPRIVACYPERIMETRALGLASS_30_120-22006318', name: 'Pantalla Frontal Individual 120cm Vidrio Laminado 4+4 Altura Variable Kuo KUAC710000' },
    1500: { codigoPT: '22000117879', lookupTag: 'KUOPRIVACYPERIMETRALGLASS_30_150-22006318', name: 'Pantalla Frontal Individual 150cm Vidrio Laminado 4+4 Altura Variable Kuo KUAC710000' },
    1650: { codigoPT: '22000118214', lookupTag: 'KUOPRIVACYPERIMETRALGLASS_30_165-22006318', name: 'Pantalla Frontal Individual 165cm Vidrio Laminado 4+4 Altura Variable Kuo KUAC710000' },
  },
});

export async function createKuoAVPantallaInstance({
  config = {},
  loadGlb = null,
  country = 'CO',
}) {
  const instanceId = config.instanceId || `KUO_PAN_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const anchoMm = config.anchoMm === 1500 ? 1500 : config.anchoMm >= 1650 ? 1650 : 1200;
  const rawTipo = (config.tipo || config.material || 'FORMICA').toUpperCase();
  const isFrontalPerimetral = rawTipo === 'FRONTAL_PERIMETRAL' || rawTipo === 'PERIMETRAL' || rawTipo === 'KUAC710000';
  const isVidrioDoble = rawTipo === 'VIDRIO' || rawTipo === 'VIDRIO LAMINADO' || rawTipo === 'KUAC660000';
  const isVidrio = isFrontalPerimetral || isVidrioDoble;
  const tipo = isFrontalPerimetral ? 'FRONTAL_PERIMETRAL' : isVidrioDoble ? 'VIDRIO' : rawTipo;

  const acabado = config.acabado || config.color || (isVidrio ? '#a5f3fc' : '#dedede');

  const dimStr = anchoMm === 1500 ? '150' : anchoMm === 1650 ? '165' : '120';
  const widthM = anchoMm === 1500 ? 1.425 : anchoMm === 1650 ? 1.575 : 1.125;

  const matMap = KUO_AV_PANTALLA_CATALOG[tipo] || KUO_AV_PANTALLA_CATALOG.FORMICA;
  const itemData = matMap[anchoMm] || matMap[1200];

  const group = new THREE.Group();
  group.name = `Pantalla Kuo AV ${dimStr}cm (${tipo})`;

  let loadedScene = null;
  let loadedWidthM = 1.125;

  if (typeof loadGlb === 'function') {
    let candidatePaths = [];
    if (isFrontalPerimetral) {
      const fileName = `KUAC710000_${dimStr}.glb`;
      const base120 = 'KUAC710000_120.glb';
      const base165 = 'KUAC710000_165.glb';
      candidatePaths = [
        `/assets/models/Kuo AV/Frontal Perimetral/${fileName}`,
        encodeURI(`/assets/models/Kuo AV/Frontal Perimetral/${fileName}`),
        `/assets/models/Kuo%20AV/Frontal%20Perimetral/${fileName}`,
        `/assets/models/Kuo AV/Frontal Perimetral/${dimStr === '165' ? base165 : base120}`,
        encodeURI(`/assets/models/Kuo AV/Frontal Perimetral/${dimStr === '165' ? base165 : base120}`),
        `/assets/models/Kuo%20AV/Frontal%20Perimetral/${dimStr === '165' ? base165 : base120}`,
        `/assets/models/Kuo AV/${fileName}`,
      ];
    } else if (isVidrioDoble) {
      const fileName = `KUAC660000_${dimStr}.glb`;
      const base120 = 'KUAC660000_120.glb';
      candidatePaths = [
        `/assets/models/Kuo AV/Pantalla Vidrio/${fileName}`,
        encodeURI(`/assets/models/Kuo AV/Pantalla Vidrio/${fileName}`),
        `/assets/models/Kuo%20AV/Pantalla%20Vidrio/${fileName}`,
        `/assets/models/Kuo AV/Pantalla Vidrio/${base120}`,
        encodeURI(`/assets/models/Kuo AV/Pantalla Vidrio/${base120}`),
        `/assets/models/Kuo%20AV/Pantalla%20Vidrio/${base120}`,
        `/assets/models/Kuo AV/${fileName}`,
      ];
    } else {
      const fileName = `KUAC690000_${dimStr}.glb`;
      const base120 = 'KUAC690000_120.glb';
      candidatePaths = [
        `/assets/models/Kuo AV/Pantalla FMT/${fileName}`,
        encodeURI(`/assets/models/Kuo AV/Pantalla FMT/${fileName}`),
        `/assets/models/Kuo%20AV/Pantalla%20FMT/${fileName}`,
        `/assets/models/Kuo AV/Pantalla FMT/${base120}`,
        encodeURI(`/assets/models/Kuo AV/Pantalla FMT/${base120}`),
        `/assets/models/Kuo%20AV/Pantalla%20FMT/${base120}`,
        `/assets/models/Kuo AV/${fileName}`,
      ];
    }

    try {
      const loaded = await loadGlb(candidatePaths);
      const gltfScene = loaded?.scene || loaded?.object || loaded || null;
      if (gltfScene) {
        loadedScene = gltfScene.clone ? gltfScene.clone(true) : gltfScene;
        const b = new THREE.Box3().setFromObject(loadedScene);
        loadedWidthM = b.max.x - b.min.x;
        if (!loadedWidthM || loadedWidthM < 0.1) loadedWidthM = 1.125;
      }
    } catch (err) {
      console.warn('[createKuoAVPantallaInstance] Error cargando GLB:', err);
    }
  }

  if (loadedScene) {
    // Parametrización en X si el modelo cargado difiere del ancho solicitado
    const scaleX = widthM / loadedWidthM;
    if (Math.abs(scaleX - 1) > 0.02) {
      loadedScene.scale.set(scaleX, 1, 1);
    }

    // Centrar la pantalla sobre su origen X y centrar el panel en Z=0
    const centerOffsetZ = isFrontalPerimetral ? 0.2075 : isVidrioDoble ? 0.012 : 0.016;
    loadedScene.position.set(-widthM / 2, 0, centerOffsetZ);

    // Configuración de materiales (vidrio translúcido o acabado sólido)
    if (isVidrio) {
      loadedScene.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.65;
          child.material.roughness = 0.1;
          child.material.metalness = 0.1;
          if (child.material.transmission !== undefined) {
            child.material.transmission = 0.85;
          }
        }
      });
    } else if (acabado) {
      const hex =
        typeof acabado === 'string' && acabado.startsWith('#')
          ? parseInt(acabado.slice(1), 16)
          : 0xdedede;
      loadedScene.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.color.setHex(hex);
        }
      });
    }

    group.add(loadedScene);
  } else {
    // Fallback visual si el GLB no estuviera disponible
    const geo = new THREE.BoxGeometry(widthM, 0.62, 0.02);
    const mat = new THREE.MeshStandardMaterial({
      color: isVidrio ? 0xbae6fd : 0xdedede,
      transparent: isVidrio,
      opacity: isVidrio ? 0.6 : 1.0,
      roughness: isVidrio ? 0.1 : 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0.31, 0);
    group.add(mesh);
  }

  const bom = [
    {
      codigo: itemData.codigoPT,
      lookupTag: itemData.lookupTag,
      description: itemData.name,
      quantity: 1,
      role: 'PANTALLA',
      modelKind: 'glb',
    },
  ];

  group.userData = {
    isPartRoot: true,
    isAssembly: true,
    instanceId,
    groupId: instanceId,
    groupName: itemData.name,
    kind: 'KUO_AV_PANTALLA_ASSEMBLY',
    type: 'pantalla',
    role: 'PANTALLA',
    selectable: true,
    materialBase: isVidrio ? 'Vidrio' : tipo === 'TELA' ? 'Tela' : 'Melamina',
    generico: 'PANTALLA',
    codigo: itemData.codigoPT,
    codigoPT: itemData.codigoPT,
    lookupTag: itemData.lookupTag,
    description: itemData.name,
    config: {
      anchoMm,
      tipo,
      acabado,
      pantallaPosicion: config.pantallaPosicion || 'LIBRE',
    },
    bom,
  };

  const partRecord = {
    id: instanceId,
    code: itemData.codigoPT,
    obj: group,
    kind: 'KUO_AV_PANTALLA_ASSEMBLY',
    type: 'pantalla',
    name: itemData.name,
  };

  return {
    object: group,
    partRecord,
    bom,
  };
}

export default createKuoAVPantallaInstance;
