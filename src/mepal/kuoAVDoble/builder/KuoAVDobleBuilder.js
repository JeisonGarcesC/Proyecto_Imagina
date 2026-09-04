// src/mepal/kuoAVDoble/builder/KuoAVDobleBuilder.js
// ─────────────────────────────────────────────────────────────────────────────
// Builder determinístico multipieza para PUESTO DOBLE KUO AV.
// Ensamble exacto, 100% parametrizado con soporte de módulos iniciales y
// extensiones laterales (Bench CET) y acabados independientes por pieza.
// ─────────────────────────────────────────────────────────────────────────────

import {
  KUO_AV_DOBLE_VARIANTS,
} from '../config/kuoAVDobleTunables.js';
import { KUO_AV_DOBLE_PART_ROLES } from '../parts/kuoAVDobleParts.js';
import { buildKuoAVDobleBOM } from '../bom/kuoAVDobleBOMCatalog.js';

export function buildKuoAVDoble(config = {}) {
  const widthMm = Number(config.anchoMm || 1200);
  const depthMm = Number(config.profundidadMm || 600); // Fondo nominal por puesto (600 o 750)
  const alturaMm = Number(config.alturaMm || 730);
  const thickMm = Number(config.thickMm || 30);

  // En Kuo AV Doble cada puesto conserva siempre su estructura completa (2 pies y 4 parales)
  const tipoPuesto = config.tipoPuesto || 'INICIAL';
  const hasLeftFoot = typeof config.pieIzquierdo === 'boolean' ? config.pieIzquierdo : true;
  const hasRightFoot = typeof config.pieDerecho === 'boolean' ? config.pieDerecho : true;
  const hasLeftParales = typeof config.paralesIzquierdos === 'boolean' ? config.paralesIzquierdos : true;
  const hasRightParales = typeof config.paralesDerechos === 'boolean' ? config.paralesDerechos : true;

  // Opciones de acabados y personalización
  const espesorTipo = config.espesorTipo || 'Formica 30';
  const acabadoSuperficieF = config.acabadoSuperficieF || config.acabadoSuperficie || '#dedede';
  const acabadoSuperficieP = config.acabadoSuperficieP || config.acabadoSuperficie || '#dedede';
  const acabadoParales = config.acabadoParales || config.kitFuenteColor || 'Blanco';
  const acabadoEstructura = config.acabadoEstructura || 'Blanco';
  const kitFuenteColor = config.kitFuenteColor || 'Blanco';
  const kitFuente = typeof config.kitFuente === 'boolean' ? config.kitFuente : true;
  const elevaKitF = !!config.elevarKitFIzquierdo;
  const acabadoGrommet = config.acabadoGrommet || 'Anodizado';
  const especial = !!config.especial;
  const baldosaFormica = !!config.baldosaFormica;
  const legacyVertebraEnabled =
    typeof config.vertebraLateral === 'boolean' ? config.vertebraLateral : true;
  const vertebraLeftEnabled =
    typeof config.vertebraLeftEnabled === 'boolean'
      ? config.vertebraLeftEnabled
      : legacyVertebraEnabled;
  const vertebraRightEnabled =
    typeof config.vertebraRightEnabled === 'boolean'
      ? config.vertebraRightEnabled
      : legacyVertebraEnabled;

  // Resolución de variantes de ancho (1200 / 1500 / 1650)
  let variantKey = 1200;
  let vigaWidthRealMm = 1196;
  let ductoWidthRealMm = 1109.1;
  let canalWidthRealMm = 1109.0;
  if (widthMm >= 1650) {
    variantKey = 1650;
    vigaWidthRealMm = 1646;
    ductoWidthRealMm = 1559.1;
    canalWidthRealMm = 1559.0;
  } else if (widthMm >= 1500) {
    variantKey = 1500;
    vigaWidthRealMm = 1496;
    ductoWidthRealMm = 1409.1;
    canalWidthRealMm = 1409.0;
  }

  // Resolución de variantes de fondo (1200 / 1500)
  let depthVariantKey = 1200;
  let costadoDepthRealMm = 1226.04;
  if (depthMm >= 750) {
    depthVariantKey = 1500;
    costadoDepthRealMm = 1525.92;
  }

  const canalVariantCode = variantKey >= 1650 ? '165' : variantKey >= 1500 ? '150' : '120';
  const vigaGlb = KUO_AV_DOBLE_VARIANTS.vigaSoporte[variantKey] || 'KUSO420000_120.glb';
  const ductoGlb = KUO_AV_DOBLE_VARIANTS.ductoCentral[variantKey] || 'KUSO830000_120.glb';
  const canalGlb = `KUSO860000_${canalVariantCode}.glb`;
  const costadoDobleGlb = KUO_AV_DOBLE_VARIANTS.costadoDoble[depthVariantKey] || 'KUSO820000_120.glb';

  const groupId = config.groupId || `KUOAVD_${widthMm}x${depthMm * 2}_H${alturaMm}_T${thickMm}`;
  const groupName = config.groupName || 'Puesto Doble Kuo AV';

  const parts = [];

  const surfaceTopY = alturaMm / 1000;
  const surfaceBottomY = (alturaMm - thickMm) / 1000;
  const surfaceCenterY = (alturaMm - thickMm / 2) / 1000;

  // Espaciado central entre las dos superficies
  const gapCentralMm = 13.0;
  const halfDepthM = depthMm / 1000 / 2;
  const gapM = (gapCentralMm / 2) / 1000;
  const halfWidthM = widthMm / 1000 / 2;

  // 1. Superficie Frontal Procedural (LKSU010010_F)
  parts.push({
    partId: `${groupId}_SURFACE_F`,
    groupId,
    codigo: 'LKSU010010_F',
    lookupTag: 'LKSU010010',
    role: KUO_AV_DOBLE_PART_ROLES.SURFACE_FRONT,
    name: 'Superficie Perimetral Frontal',
    modelKind: 'procedural',
    type: 'superficie',
    color: acabadoSuperficieF,
    proceduralParams: {
      shapeType: 'RECTANGULAR',
      widthMm,
      depthMm,
      thickMm,
      espesorTipo,
      cantoMm: 2,
    },
    position: [0, surfaceCenterY, halfDepthM + gapM],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });

  // 2. Superficie Posterior Procedural (LKSU010010_P)
  parts.push({
    partId: `${groupId}_SURFACE_P`,
    groupId,
    codigo: 'LKSU010010_P',
    lookupTag: 'LKSU010010',
    role: KUO_AV_DOBLE_PART_ROLES.SURFACE_BACK,
    name: 'Superficie Perimetral Posterior',
    modelKind: 'procedural',
    type: 'superficie',
    color: acabadoSuperficieP,
    proceduralParams: {
      shapeType: 'RECTANGULAR',
      widthMm,
      depthMm,
      thickMm,
      espesorTipo,
      cantoMm: 2,
    },
    position: [0, surfaceCenterY, -(halfDepthM + gapM)],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });

  // 3. Pies Dobles KUSO820000
  const costadoHalfZM = (costadoDepthRealMm / 2) / 1000;

  // Pie Izquierdo
  if (hasLeftFoot) {
    parts.push({
      partId: `${groupId}_FOOT_LEFT`,
      groupId,
      codigo: `KUSO820000_${depthVariantKey}_IZQ`,
      lookupTag: 'KUSO820000',
      role: KUO_AV_DOBLE_PART_ROLES.SUPPORT_LEFT,
      name: `Pie Doble Izquierdo ${depthVariantKey}`,
      modelKind: 'glb',
      glb: `/assets/models/Kuo AV/Puesto Doble/${costadoDobleGlb}`,
      colorVariante: acabadoEstructura,
      position: [-halfWidthM, 0, costadoHalfZM],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
  }

  // Pie Derecho
  if (hasRightFoot) {
    parts.push({
      partId: `${groupId}_FOOT_RIGHT`,
      groupId,
      codigo: `KUSO820000_${depthVariantKey}_DER`,
      lookupTag: 'KUSO820000',
      role: KUO_AV_DOBLE_PART_ROLES.SUPPORT_RIGHT,
      name: `Pie Doble Derecho ${depthVariantKey}`,
      modelKind: 'glb',
      glb: `/assets/models/Kuo AV/Puesto Doble/${costadoDobleGlb}`,
      colorVariante: acabadoEstructura,
      position: [halfWidthM, 0, -costadoHalfZM],
      rotation: [0, Math.PI, 0],
      scale: [1, 1, 1],
    });
  }

  // 4. Parales Linak KUAC1040000
  const paralGlb = alturaMm >= 1000 ? 'KUAC1040000_120.glb' : 'KUAC1040000_74.glb';
  const paralScaleY = (alturaMm - thickMm) / 700.0;

  const zParalOffset = (depthMm - 600) / 2000.0;
  const zParalFront = 0.350 + zParalOffset;
  const zParalBack = -(0.270 + zParalOffset);

  // Parales Izquierdos
  if (hasLeftParales) {
    parts.push({
      partId: `${groupId}_PARAL_IZQ_F`,
      groupId,
      codigo: 'KUAC1040000_IZQ_F',
      lookupTag: 'KUAC1040000',
      role: KUO_AV_DOBLE_PART_ROLES.SUPPORT_LEFT,
      name: 'Paral Elevable Linak Izquierdo Frontal',
      modelKind: 'glb',
      glb: `/assets/models/Kuo AV/Puesto Doble/${paralGlb}`,
      colorVariante: acabadoParales,
      position: [-halfWidthM + 0.016, 0.023, zParalFront],
      rotation: [0, 0, 0],
      scale: [1, paralScaleY, 1],
    });

    parts.push({
      partId: `${groupId}_PARAL_IZQ_P`,
      groupId,
      codigo: 'KUAC1040000_IZQ_P',
      lookupTag: 'KUAC1040000',
      role: KUO_AV_DOBLE_PART_ROLES.SUPPORT_LEFT,
      name: 'Paral Elevable Linak Izquierdo Posterior',
      modelKind: 'glb',
      glb: `/assets/models/Kuo AV/Puesto Doble/${paralGlb}`,
      colorVariante: acabadoParales,
      position: [-halfWidthM + 0.066, 0.023, zParalBack],
      rotation: [0, Math.PI, 0],
      scale: [1, paralScaleY, 1],
    });
  }

  // Parales Derechos
  if (hasRightParales) {
    parts.push({
      partId: `${groupId}_PARAL_DER_F`,
      groupId,
      codigo: 'KUAC1040000_DER_F',
      lookupTag: 'KUAC1040000',
      role: KUO_AV_DOBLE_PART_ROLES.SUPPORT_RIGHT,
      name: 'Paral Elevable Linak Derecho Frontal',
      modelKind: 'glb',
      glb: `/assets/models/Kuo AV/Puesto Doble/${paralGlb}`,
      colorVariante: acabadoParales,
      position: [halfWidthM - 0.066, 0.023, zParalFront],
      rotation: [0, 0, 0],
      scale: [1, paralScaleY, 1],
    });

    parts.push({
      partId: `${groupId}_PARAL_DER_P`,
      groupId,
      codigo: 'KUAC1040000_DER_P',
      lookupTag: 'KUAC1040000',
      role: KUO_AV_DOBLE_PART_ROLES.SUPPORT_RIGHT,
      name: 'Paral Elevable Linak Derecho Posterior',
      modelKind: 'glb',
      glb: `/assets/models/Kuo AV/Puesto Doble/${paralGlb}`,
      colorVariante: acabadoParales,
      position: [halfWidthM - 0.016, 0.023, zParalBack],
      rotation: [0, Math.PI, 0],
      scale: [1, paralScaleY, 1],
    });
  }

  // 5. Vigas Soporte Longitudinales KUSO420000
  const vigaHalfXM = (vigaWidthRealMm / 2) / 1000;
  const vigaYM = surfaceBottomY - 0.050;
  const vigaZM = (depthMm / 1000) - 0.0435;

  parts.push({
    partId: `${groupId}_BEAM_FRONT`,
    groupId,
    codigo: `KUSO420000_${variantKey}_F`,
    lookupTag: 'KUSO420000',
    role: KUO_AV_DOBLE_PART_ROLES.BEAM_FRONT,
    name: `Viga Soporte Frontal ${variantKey}`,
    modelKind: 'glb',
    glb: `/assets/models/Kuo AV/Puesto Doble/${vigaGlb}`,
    colorVariante: acabadoEstructura,
    position: [-vigaHalfXM, vigaYM, vigaZM],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });

  parts.push({
    partId: `${groupId}_BEAM_BACK`,
    groupId,
    codigo: `KUSO420000_${variantKey}_P`,
    lookupTag: 'KUSO420000',
    role: KUO_AV_DOBLE_PART_ROLES.BEAM_BACK,
    name: `Viga Soporte Posterior ${variantKey}`,
    modelKind: 'glb',
    glb: `/assets/models/Kuo AV/Puesto Doble/${vigaGlb}`,
    colorVariante: acabadoEstructura,
    position: [vigaHalfXM, vigaYM, -vigaZM],
    rotation: [0, Math.PI, 0],
    scale: [1, 1, 1],
  });

  // 6. Canales Superiores de Electrificación KUSO860000
  const canalHalfXM = (canalWidthRealMm / 2) / 1000;
  const canalYM = surfaceBottomY - 0.1459;

  parts.push({
    partId: `${groupId}_CANAL_SUP_F`,
    groupId,
    codigo: `KUSO860000_${variantKey}_F`,
    lookupTag: 'KUSO860000',
    role: KUO_AV_DOBLE_PART_ROLES.DOUBLE_DUCT,
    name: `Canal Superior Frontal ${variantKey}`,
    modelKind: 'glb',
    glb: `/assets/models/Kuo AV/Puesto Perimetral/${canalGlb}`,
    colorVariante: acabadoEstructura,
    position: [-canalHalfXM, canalYM, 0.140],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });

  parts.push({
    partId: `${groupId}_CANAL_SUP_P`,
    groupId,
    codigo: `KUSO860000_${variantKey}_P`,
    lookupTag: 'KUSO860000',
    role: KUO_AV_DOBLE_PART_ROLES.DOUBLE_DUCT,
    name: `Canal Superior Posterior ${variantKey}`,
    modelKind: 'glb',
    glb: `/assets/models/Kuo AV/Puesto Perimetral/${canalGlb}`,
    colorVariante: acabadoEstructura,
    position: [canalHalfXM, canalYM, -0.140],
    rotation: [0, Math.PI, 0],
    scale: [1, 1, 1],
  });

  // 7. Ducto Central Inferior KUSO830000
  const ductoHalfXM = (ductoWidthRealMm / 2) / 1000;
  const ductoYM = 0.308;

  parts.push({
    partId: `${groupId}_DOUBLE_DUCT`,
    groupId,
    codigo: `KUSO830000_${variantKey}`,
    lookupTag: 'KUSO830000',
    role: KUO_AV_DOBLE_PART_ROLES.DOUBLE_DUCT,
    name: `Ducto Central Inferior ${variantKey}`,
    modelKind: 'glb',
    glb: `/assets/models/Kuo AV/Puesto Doble/${ductoGlb}`,
    colorVariante: acabadoEstructura,
    position: [-ductoHalfXM, ductoYM, 0.1225],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });

  // 8. Grommet Doble Abatible LKAC250000_DOBLE
  parts.push({
    partId: `${groupId}_GROMMET_DOUBLE`,
    groupId,
    codigo: 'LKAC250000_DOBLE',
    lookupTag: 'LKAC250000',
    role: KUO_AV_DOBLE_PART_ROLES.GROMMET_LEFT,
    name: 'Grommet Doble Abatible',
    modelKind: 'glb',
    glb: '/assets/models/Kuo AV/Puesto Doble/LKAC250000_DOBLE.glb',
    colorVariante: acabadoGrommet,
    acabado: acabadoGrommet,
    position: [-0.256, surfaceTopY - 0.0335, 0.1285],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });

  // 9. Soportes de Tomas Eléctricas (2 x KUAC680000)
  parts.push({
    partId: `${groupId}_SOCKET_FRONT`,
    groupId,
    codigo: 'KUAC680000_F',
    lookupTag: 'KUAC680000',
    role: KUO_AV_DOBLE_PART_ROLES.POWER_OUTLET_LEFT,
    name: 'Soporte Tomas Frontal',
    modelKind: 'glb',
    glb: '/assets/models/Kuo AV/Puesto Perimetral/KUAC680000.glb',
    colorVariante: acabadoEstructura,
    position: [-0.3035, canalYM, 0.1161],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });

  parts.push({
    partId: `${groupId}_SOCKET_BACK`,
    groupId,
    codigo: 'KUAC680000_P',
    lookupTag: 'KUAC680000',
    role: KUO_AV_DOBLE_PART_ROLES.POWER_OUTLET_RIGHT,
    name: 'Soporte Tomas Posterior',
    modelKind: 'glb',
    glb: '/assets/models/Kuo AV/Puesto Perimetral/KUAC680000.glb',
    colorVariante: acabadoEstructura,
    position: [0.3035, canalYM, -0.1161],
    rotation: [0, Math.PI, 0],
    scale: [1, 1, 1],
  });

  // 10. Kit Fuente Doble (KUAC1040000_74Doble)
  if (kitFuente) {
    const yKit = elevaKitF ? surfaceBottomY - 0.288 : surfaceBottomY - 0.5761;
    parts.push({
      partId: `${groupId}_POWER_KIT`,
      groupId,
      codigo: 'KUAC1040000_74Doble',
      lookupTag: 'KUAC1040000',
      role: KUO_AV_DOBLE_PART_ROLES.POWER_KIT_LEFT,
      name: 'Kit Fuente Central Doble',
      modelKind: 'glb',
      glb: '/assets/models/Kuo AV/Puesto Doble/KUAC1040000_74Doble.glb',
      colorVariante: kitFuenteColor,
      position: [-0.024, yKit, 0.040],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
  }

  // 11. Vértebras Pasacables KUAC650000
  if (vertebraLeftEnabled) {
    parts.push({
      partId: `${groupId}_VERTEBRA_FRONT`,
      groupId,
      codigo: '22000116690',
      lookupTag: 'KUAC650000',
      role: KUO_AV_DOBLE_PART_ROLES.VERTEBRA_LEFT,
      type: 'vertebra',
      name: 'Vértebra Pasacables Frontal',
      modelKind: 'glb',
      glb: '/assets/models/Kuo AV/Puesto Doble/KUAC650000.glb',
      colorVariante: acabadoEstructura,
      position: [-0.035, 0.08, 0.10],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
  }

  if (vertebraRightEnabled) {
    parts.push({
      partId: `${groupId}_VERTEBRA_BACK`,
      groupId,
      codigo: '22000116690',
      lookupTag: 'KUAC650000',
      role: KUO_AV_DOBLE_PART_ROLES.VERTEBRA_RIGHT,
      type: 'vertebra',
      name: 'Vértebra Pasacables Posterior',
      modelKind: 'glb',
      glb: '/assets/models/Kuo AV/Puesto Doble/KUAC650000.glb',
      colorVariante: acabadoEstructura,
      position: [0.035, 0.08, -0.10],
      rotation: [0, Math.PI, 0],
      scale: [1, 1, 1],
    });
  }

  // 12. Botoneras LINAK de Control (2 x DPBK06)
  parts.push({
    partId: `${groupId}_BUTTON_FRONT`,
    groupId,
    codigo: 'DPBK06_F',
    lookupTag: 'DPBK06',
    role: KUO_AV_DOBLE_PART_ROLES.BUTTONS,
    name: 'Botonera LINAK Control Frontal',
    modelKind: 'logical',
    type: 'control',
  });

  parts.push({
    partId: `${groupId}_BUTTON_BACK`,
    groupId,
    codigo: 'DPBK06_P',
    lookupTag: 'DPBK06',
    role: KUO_AV_DOBLE_PART_ROLES.BUTTONS,
    name: 'Botonera LINAK Control Posterior',
    modelKind: 'logical',
    type: 'control',
  });

  // 13. Baldosa Divisoria Central Opcional
  if (baldosaFormica) {
    parts.push({
      partId: `${groupId}_BALDOSA`,
      groupId,
      codigo: 'KUBAL01',
      lookupTag: 'KUBAL01',
      role: KUO_AV_DOBLE_PART_ROLES.BALDOSA,
      name: 'Baldosa Divisoria Formica',
      modelKind: 'procedural',
      type: 'accesorio',
      proceduralParams: {
        shapeType: 'PANEL_DIVISORIO',
        widthMm: widthMm - 100,
        heightMm: 350,
        thickMm: 18,
      },
      position: [0, surfaceTopY + 0.175, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
  }

  // 14. Pantalla Formica / Melamina / Tela (KUAC690000 / KUAC700000 / KUAC670000)
  const hasPantalla =
    config.pantalla !== undefined
      ? !!config.pantalla
      : config.pantallaEnabled !== undefined
      ? !!config.pantallaEnabled
      : false;
  const pantallaTipo = config.pantallaTipo || 'FORMICA'; // FORMICA | MELAMINA | TELA
  const pantallaPosicion = config.pantallaPosicion || 'CENTRAL'; // CENTRAL | POSTERIOR | FRONTAL
  const pantallaAcabado = config.pantallaAcabado || '#dedede';

  if (hasPantalla) {
    let panDimStr = '120';
    let panWidthM = 1.125;
    if (widthMm === 1500) {
      panDimStr = '150';
      panWidthM = 1.425;
    } else if (widthMm >= 1650) {
      panDimStr = '165';
      panWidthM = 1.575;
    }

    let codigoPT = '22000116713';
    let lookupTag = `KUOPRIVACYPANEL_30_${panDimStr}-22008689`;
    let planoCode = 'KUAC690000';
    let materialName = 'FORMICA';

    let glbPath = `/assets/models/Kuo AV/Pantalla FMT/KUAC690000_${panDimStr}.glb`;

    if (pantallaTipo === 'VIDRIO' || pantallaTipo === 'VIDRIO LAMINADO') {
      planoCode = 'KUAC660000';
      materialName = 'VIDRIO LAMINADO';
      if (widthMm === 1200) codigoPT = '22000116695';
      else if (widthMm === 1500) codigoPT = '22000116337';
      else codigoPT = '22000116696';
      lookupTag = `KUOPRIVACYPANELGLASS_30_${panDimStr}-22006318`;
      glbPath = `/assets/models/Kuo AV/Pantalla Vidrio/KUAC660000_120.glb`;
    } else if (pantallaTipo === 'MELAMINA') {
      planoCode = 'KUAC700000';
      materialName = 'MELAMINICO';
      if (widthMm === 1200) codigoPT = '22000116716';
      else if (widthMm === 1500) codigoPT = '22000116821';
      else codigoPT = '22000116822';
      lookupTag = `KUOPRIVACYPANEL_30_${panDimStr}-22015138`;
    } else if (pantallaTipo === 'TELA') {
      planoCode = 'KUAC670000';
      materialName = 'ACUSTICA';
      if (widthMm === 1200) codigoPT = '22000116710';
      else if (widthMm === 1500) codigoPT = '22000116711';
      else codigoPT = '22000116712';
      lookupTag = `KUOPRIVACYPANEL_30_${panDimStr}-22021827`;
    } else {
      // FORMICA
      if (widthMm === 1200) codigoPT = '22000116713';
      else if (widthMm === 1500) codigoPT = '22000116714';
      else codigoPT = '22000116715';
    }

    let posZ = 0; // Central (eje Z=0)
    if (pantallaPosicion === 'POSTERIOR') {
      posZ = -(halfDepthM * 2 + gapM);
    } else if (pantallaPosicion === 'FRONTAL') {
      posZ = (halfDepthM * 2 + gapM);
    }

    const scaleX = (pantallaTipo === 'VIDRIO' || pantallaTipo === 'VIDRIO LAMINADO') && widthMm !== 1200
      ? panWidthM / 1.125
      : 1;

    parts.push({
      partId: `${groupId}_PANTALLA`,
      groupId,
      codigo: codigoPT,
      lookupTag,
      role: KUO_AV_DOBLE_PART_ROLES.PANTALLA,
      name: `Pantalla Frontal ${panDimStr}cm ${materialName} Altura Variable Kuo ${planoCode}`,
      modelKind: 'glb',
      type: 'pantalla',
      glb: glbPath,
      colorVariante: pantallaAcabado,
      position: [-panWidthM / 2, surfaceCenterY - 0.268, posZ],
      rotation: [0, 0, 0],
      scale: [scaleX, 1, 1],
    });
  }

  const effectiveConfig = {
    ...config,
    anchoMm: widthMm,
    profundidadMm: depthMm,
    alturaMm,
    thickMm,
    tipoPuesto,
    pieIzquierdo: hasLeftFoot,
    pieDerecho: hasRightFoot,
    paralesIzquierdos: hasLeftParales,
    paralesDerechos: hasRightParales,
    espesorTipo,
    acabadoSuperficieF,
    acabadoSuperficieP,
    acabadoParales,
    acabadoEstructura,
    kitFuenteColor,
    kitFuente,
    elevarKitFIzquierdo: elevaKitF,
    acabadoGrommet,
    especial,
    baldosaFormica,
    costadoIntermedio:
      typeof config.costadoIntermedio === 'boolean' ? config.costadoIntermedio : false,
    vertebraLeftEnabled,
    vertebraRightEnabled,
    pantalla: hasPantalla,
    pantallaTipo,
    pantallaPosicion,
    pantallaAcabado,
  };
  const bom = buildKuoAVDobleBOM(effectiveConfig, parts);

  return {
    kind: 'KUO_AV_DOBLE_ASSEMBLY',
    groupId,
    groupName,
    config: effectiveConfig,
    dimMm: {
      width: widthMm,
      depth: depthMm * 2 + gapCentralMm,
      height: alturaMm,
      thick: thickMm,
    },
    parts,
    bom,
  };
}

export default buildKuoAVDoble;
