// src/koncisaPlus/leader/KoncisaLeaderBuilder.js

import { createLeaderMainSurface, createLeaderReturnSurface } from './parts/leaderSurfaces';
import { createCostado } from '../parts/costados';
import { createViga } from '../parts/vigas';
import { createGrommet } from '../parts/grommets';
import { createLeaderCredenzaBeamDecoration, createLeaderMainBeam } from './parts/leaderBeams';
import { createLeaderCredenza } from './parts/leaderCredenzas';

import { resolveLeaderCostadoWithOutlet } from './rules/leaderCostadoOutletRules';

import { createLeaderMainSkirt } from './parts/leaderSkirts';

function enableBoundedDepthForLeaderRect(costado, rootPositionMm) {
  const isRectAssembly =
    String(costado?.meta?.forma || '').toUpperCase() === 'RECT' &&
    costado?.model?.kind === 'koncisa-costado-assembly';

  if (!isRectAssembly) return costado;

  costado.meta = {
    ...(costado.meta || {}),
    positioningMode: 'bounded-depth-leader-v1',
    boundedDepthRootPositionMm: rootPositionMm,
  };

  return costado;
}

//posicion del grommet puesto lider
function createLeaderSurfaceGrommet({
  groupId,
  groupName,
  surfaceRole,
  position = 'CENTER',
  finish = 'ALUMINIUM',
  widthMm,
  depthMm,
  centerX,
  centerZ,
  rotationY = 0,
}) {
  const positionKey = String(position || 'CENTER')
    .trim()
    .toUpperCase();
  const localX = positionKey === 'LEFT' ? -widthMm / 4 : positionKey === 'RIGHT' ? widthMm / 4 : 0;
  const localZ = depthMm <= 600 ? -190 : -255;
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const x = centerX + localX * cos + localZ * sin;
  const z = centerZ - localX * sin + localZ * cos;
  const grommet = createGrommet({
    groupId,
    groupName,
    finish,
    diameterMm: 80,
    x,
    y: 740,
    z,
    rotY: rotationY,
  });

  grommet.meta = {
    ...(grommet.meta || {}),
    layoutType: 'LEADER',
    leaderRole: `${surfaceRole}_GROMMET`,
    targetSurfaceRole: surfaceRole,
    position: positionKey,
    localPositionMm: { x: localX, z: localZ },
  };

  return grommet;
}

export function buildKoncisaLeader(config = {}) {
  const groupId = `KONCISA_LEADER_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  const groupName = 'Koncisa Plus - Puesto Líder';

  const {
    leaderMainWidthMm = 1500,
    leaderMainDepthMm = 600,

    leaderReturnLengthMm = 900,
    leaderReturnDepthMm = 600,

    leaderSide = 'RIGHT',
    leaderCredenza = null,

    leaderMainCostadoForma = 'RECT',
    leaderJunctionHasOutletBox = false,

    thickMm = 30,
    leaderMaterialType = 'FORMICA',
    finishCode = '22008689',

    leaderHasGrommetBox = false,
    leaderMainGrommet = null,
    leaderReturnGrommet = null,

    // Falda principal
    leaderHasSkirt = false,

    leaderSkirtMaterialType = 'METALICA',

    leaderSkirtFinishCode = null,
  } = config;

  const parts = [];

  const sideKey =
    String(leaderSide || 'RIGHT')
      .trim()
      .toUpperCase() === 'LEFT'
      ? 'LEFT'
      : 'RIGHT';
  const leaderCredenzaEnabled = leaderCredenza?.enabled === true;
  const credenzaSide =
    String(leaderCredenza?.side || sideKey)
      .trim()
      .toUpperCase() === 'LEFT'
      ? 'LEFT'
      : 'RIGHT';
  const credenzaLengthMm = Math.min(1800, Math.max(1500, Number(leaderCredenza?.lengthMm) || 1500));

  const mainSurface = createLeaderMainSurface({
    groupId,
    groupName,

    widthMm: leaderMainWidthMm,
    depthMm: leaderMainDepthMm,
    thickMm,

    materialType: leaderMaterialType,
    finishCode,

    x: 0,
    y: 710,
    z: 0,
  });

  parts.push(mainSurface);

  if (leaderMainGrommet?.enabled === true) {
    parts.push(
      createLeaderSurfaceGrommet({
        groupId,
        groupName,
        surfaceRole: 'MAIN',
        position: leaderMainGrommet.position,
        finish: leaderMainGrommet.finish,
        widthMm: leaderMainWidthMm,
        depthMm: leaderMainDepthMm,
        centerX: mainSurface.position.x,
        centerZ: mainSurface.position.z,
        rotationY: mainSurface.rotation.y,
      })
    );
  }

  if (leaderCredenzaEnabled) {
    parts.push(
      createLeaderCredenza({
        groupId,
        groupName,
        side: credenzaSide,
        lengthMm: credenzaLengthMm,
        mainWidthMm: leaderMainWidthMm,
        mainDepthMm: leaderMainDepthMm,
      })
    );
  }

  const returnX =
    sideKey === 'RIGHT'
      ? leaderMainWidthMm / 2 - leaderReturnDepthMm / 2
      : -leaderMainWidthMm / 2 + leaderReturnDepthMm / 2;

  /*
   * La superficie de retorno se rota 90°.
   *
   * Después de rotarla:
   * - su largo ocupa el eje Z;
   * - su profundidad ocupa el eje X.
   *
   * Para que quede unida a la superficie principal,
   * una parte de su extremo debe entrar bajo/contra la principal.
   */
  const returnOverlapMm = leaderMainDepthMm / 2;

  const returnZ = -(leaderMainDepthMm / 2 + leaderReturnLengthMm / 2);

  if (!leaderCredenzaEnabled) {
    const returnSurface = createLeaderReturnSurface({
      groupId,
      groupName,

      side: sideKey,

      lengthMm: leaderReturnLengthMm,
      depthMm: leaderReturnDepthMm,
      thickMm,

      x: returnX,
      y: 710,
      z: returnZ,

      rotY: sideKey === 'RIGHT' ? Math.PI / 2 : -Math.PI / 2,

      hasGrommetBox: leaderHasGrommetBox,
    });

    parts.push(returnSurface);

    const returnGrommetEnabled =
      leaderReturnGrommet?.enabled === true ||
      (leaderReturnGrommet == null && leaderHasGrommetBox === true);
    if (returnGrommetEnabled) {
      parts.push(
        createLeaderSurfaceGrommet({
          groupId,
          groupName,
          surfaceRole: 'RETURN',
          position: leaderReturnGrommet?.position,
          finish: leaderReturnGrommet?.finish,
          widthMm: leaderReturnLengthMm,
          depthMm: leaderReturnDepthMm,
          centerX: returnSurface.position.x,
          centerZ: returnSurface.position.z,
          rotationY: returnSurface.rotation.y,
        })
      );
    }
  }

  // =====================================================
  // FALDA DE LA SUPERFICIE PRINCIPAL
  // =====================================================

  //console.log('leaderMainDepthMm', leaderMainDepthMm);
  if (leaderHasSkirt) {
    const mainSkirt = createLeaderMainSkirt({
      groupId,
      groupName,

      realMainWidthMm: leaderMainWidthMm,

      materialType: leaderSkirtMaterialType,

      finishCode: leaderSkirtFinishCode,

      //posicion de la falda pantalla puesto lider, original.
      x: 0,
      y: 710 - thickMm - 30 - 60 - 30,
      z: 300 - 20, //-leaderMainDepthMm / 2 + 30,
      rotationY: 0,
    });

    parts.push(mainSkirt);
  }

  // =====================================================
  // COSTADOS DE LA SUPERFICIE PRINCIPAL
  // =====================================================

  // Extremo libre: costado rectangular normal
  const mainFreeSide = sideKey === 'RIGHT' ? 'izq' : 'der';

  const mainTerminalX = sideKey === 'RIGHT' ? -leaderMainWidthMm / 2 : leaderMainWidthMm / 2;

  const mainTerminalZ = sideKey === 'RIGHT' ? leaderMainDepthMm / 2 : -leaderMainDepthMm / 2;

  const mainTerminalCostado = createCostado({
    groupId,
    groupName,

    tipo: 'terminal',
    tipoPuesto: 'sencillo',

    depthMm: leaderMainDepthMm,
    forma: leaderMainCostadoForma,
    lado: mainFreeSide,

    x: mainTerminalX,
    y: 0,
    z: mainTerminalZ,
  });

  /*
  mainTerminalCostado.meta = {
    ...(mainTerminalCostado.meta || {}),

    layoutType: 'LEADER',
    leaderRole: 'MAIN_FREE_END',

    moduleIndex: 0,
    replaceZone: 'MAIN_FREE_END',

    replaceKey: 'KONCISA_LEADER_MAIN_FREE_END',
  };
*/

  mainTerminalCostado.meta = {
    ...(mainTerminalCostado.meta || {}),

    layoutType: 'LEADER',
    leaderRole: 'MAIN_FREE_END',

    moduleIndex: 0,
    replaceZone: 'MAIN_FREE_END',

    // Los costados de la superficie principal
    // no reciben pedestal.
    pedestalTarget: false,

    hasOutletBox: false,
  };

  enableBoundedDepthForLeaderRect(mainTerminalCostado, {
    x: mainTerminalX,
    y: 0,
    z: 0,
  });

  mainTerminalCostado.replaceKey = 'KONCISA_LEADER_MAIN_FREE_END';

  parts.push(mainTerminalCostado);

  // =====================================================
  // COSTADO PRINCIPAL CON CAJA DE TOMAS
  // Se ubica en el extremo donde conecta el retorno.
  // =====================================================

  const outletResolved = leaderJunctionHasOutletBox
    ? resolveLeaderCostadoWithOutlet({
        forma: leaderMainCostadoForma,
        depthMm: leaderMainDepthMm,
      })
    : null;

  const junctionCostadoSide = sideKey === 'RIGHT' ? 'der' : 'izq';

  const junctionCostadoX = sideKey === 'RIGHT' ? leaderMainWidthMm / 2 : -leaderMainWidthMm / 2;

  const junctionCostadoZ = sideKey === 'RIGHT' ? -leaderMainDepthMm / 2 : leaderMainDepthMm / 2;

  const junctionCostado = createCostado({
    groupId,
    groupName,

    tipo: 'terminal',
    tipoPuesto: 'sencillo',

    depthMm: leaderMainDepthMm,

    // Es el mismo costado elegido para el extremo libre.
    forma: leaderMainCostadoForma,
    lado: junctionCostadoSide,

    x: junctionCostadoX,
    y: 0,
    z: junctionCostadoZ,
  });

  junctionCostado.meta = {
    ...(junctionCostado.meta || {}),

    layoutType: 'LEADER',
    leaderRole: 'MAIN_RETURN_JUNCTION',

    moduleIndex: 0,

    replaceZone: sideKey === 'RIGHT' ? 'RIGHT' : 'LEFT',

    replaceKey: `KONCISA_LEADER_MAIN_RETURN_${sideKey}`,

    // En estos costados no se ofrece pedestal.
    pedestalTarget: false,

    hasOutletBox: !!leaderJunctionHasOutletBox,

    outletBoxSrc: '/assets/models/koncisaPlus/CAJA_TOMAS_COSTADO.glb',

    //posicion caja toma costado
    outletBoxOffsetMm: {
      x: 0,
      y: 0,
      z: 0,
    },

    outletBoxRotation: {
      x: 0,
      y: 0,
      z: 0,
    },

    outletBoxScale: 1,

    isSpecial: outletResolved?.isSpecial || junctionCostado.meta?.isSpecial || false,

    descriptionPrefix:
      outletResolved?.descriptionPrefix || junctionCostado.meta?.descriptionPrefix || '',

    descriptionSuffix:
      outletResolved?.descriptionSuffix || junctionCostado.meta?.descriptionSuffix || '',
  };

  enableBoundedDepthForLeaderRect(junctionCostado, {
    x: junctionCostadoX,
    y: 0,
    z: 0,
  });

  junctionCostado.replaceKey = `KONCISA_LEADER_MAIN_RETURN_${sideKey}`;

  if (!leaderCredenzaEnabled) {
    parts.push(junctionCostado);

    // Si está activada y existe la regla, sustituye solo los datos comerciales.
    if (leaderJunctionHasOutletBox && outletResolved?.exists) {
      junctionCostado.code = outletResolved.codigoPT;

      junctionCostado.rawCodigoPT = outletResolved.codigoPT;

      junctionCostado.logicalCode = outletResolved.logicalCode;

      junctionCostado.existsInCatalog = true;

      junctionCostado.name = outletResolved.isSpecial
        ? `${outletResolved.descriptionPrefix} Costado ${leaderMainCostadoForma} con caja de tomas ${outletResolved.billingDepthMm} - ${outletResolved.descriptionSuffix}`
        : `Costado ${leaderMainCostadoForma} con caja de tomas ${outletResolved.billingDepthMm}`;
    }
  }

  //const returnCostadoSide = sideKey === 'RIGHT' ? 'der' : 'izq';

  //const returnCostadoSide = sideKey === 'RIGHT' ? 'izq' : 'der';

  const returnTerminalX = returnX;

  const returnTerminalZ = returnZ - leaderReturnLengthMm / 2;

  //console.log('returnTerminalZ: ', returnTerminalZ);
  //console.log('leaderReturnLengthMm : ', leaderReturnLengthMm);
  /*
  const returnTerminalCostado = createCostado({
    groupId,
    groupName,

    tipo: 'terminal',
    tipoPuesto: 'sencillo',

    depthMm: leaderReturnDepthMm,

    forma: leaderMainCostadoForma,
    lado: returnCostadoSide,

    x: returnX,
    y: 0,

    // Extremo libre del retorno.
    z: -leaderReturnLengthMm,
  });

  const baseRotationY = Number(returnTerminalCostado.rotation?.y || 0);

  const extraRotationY = sideKey === 'RIGHT' ? Math.PI / 2 : -Math.PI / 2;

  returnTerminalCostado.rotation = {
    ...(returnTerminalCostado.rotation || {}),
    x: 0,
    y: baseRotationY + extraRotationY,
    z: 0,
  };
*/

  /*
  returnTerminalCostado.rotation = {
    ...(returnTerminalCostado.rotation || {}),
    x: 0,
    y: sideKey === 'RIGHT' ? Math.PI / 2 : -Math.PI / 2,
    z: 0,
  };
*/

  /*
  returnTerminalCostado.meta = {
    ...(returnTerminalCostado.meta || {}),
    layoutType: 'LEADER',
    leaderRole: 'RETURN_END',
    moduleIndex: 0,
    replaceZone: 'RETURN_END',
  };
*/
  /*
  returnTerminalCostado.meta = {
    ...(returnTerminalCostado.meta || {}),

    layoutType: 'LEADER',
    leaderRole: 'RETURN_END',

    moduleIndex: 0,
    replaceZone: 'RETURN_END',

    // Este sí puede conservar las propiedades normales.
    pedestalTarget: true,

    hasOutletBox: false,
  };

  returnTerminalCostado.replaceKey = 'KONCISA_LEADER_RETURN_END';

  parts.push(returnTerminalCostado);
*/
  // =====================================================
  // COSTADO DEL EXTREMO DE LA SUPERFICIE DE RETORNO
  // =====================================================

  /*
   * El costado se construye siempre desde su orientación local IZQ.
   * La orientación global LEFT/RIGHT del puesto se controla después
   * rotando el ensamble completo ±90 grados.
   */
  const returnCostadoSide = 'izq';

  //posicion de los costados de puesto lider, superficie extra.
  if (!leaderCredenzaEnabled) {
    const returnTerminalCostado = createCostado({
      groupId,
      groupName,

      tipo: 'terminal',
      tipoPuesto: 'sencillo',

      depthMm: leaderReturnDepthMm,

      forma: leaderMainCostadoForma,
      lado: returnCostadoSide,

      x: returnX,
      y: 0,
      z: -leaderReturnLengthMm,
    });

    returnTerminalCostado.rotation = {
      ...(returnTerminalCostado.rotation || {}),
      x: 0,

      y: sideKey === 'RIGHT' ? -Math.PI / 2 : -Math.PI / 2,

      z: 0,
    };

    returnTerminalCostado.meta = {
      ...(returnTerminalCostado.meta || {}),

      layoutType: 'LEADER',
      leaderRole: 'RETURN_END',

      moduleIndex: 0,
      replaceZone: 'RETURN_END',

      pedestalTarget: true,
      hasOutletBox: false,

      localCostadoSide: returnCostadoSide,
      leaderSide: sideKey,
    };

    enableBoundedDepthForLeaderRect(returnTerminalCostado, {
      x: returnTerminalX,
      y: 0,
      z: returnTerminalZ,
    });

    returnTerminalCostado.replaceKey = 'KONCISA_LEADER_RETURN_END';

    parts.push(returnTerminalCostado);
  }

  //Viga puesto lider

  const mainBeam = createLeaderMainBeam({
    groupId,
    groupName,

    realMainWidthMm: leaderMainWidthMm,
    hasOutletBox: leaderCredenzaEnabled || leaderJunctionHasOutletBox,
    hasCredenza: leaderCredenzaEnabled,

    x: 0,
    y: 685,

    z: 0, //sideKey === 'RIGHT' ? leaderMainDepthMm / 2 - 80 : -leaderMainDepthMm / 2 + 80,
  });

  parts.push(mainBeam);

  if (leaderCredenzaEnabled) {
    parts.push(
      createLeaderCredenzaBeamDecoration({
        groupId,
        groupName,
        side: credenzaSide,
        beamLengthMm: mainBeam.dimMm.widthMm,
        x: mainBeam.position.x,
        y: mainBeam.position.y,
        z: mainBeam.position.z,
        leaderMainWidthMm: leaderMainWidthMm,
      })
    );
  }

  /*
  parts.push({
    type: 'leaderUnionSupport',
    subtype: 'surface-junction',
    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: 22000109449,
    logicalCode: 'KONCISA_LEADER_UNION_SUPPORT',

    name: 'LAMINA DE UNION SUPERFICIE MAC390020',

    dimMm: {
      widthMm: 100,
      heightMm: 50,
      depthMm: 100,
    },

    position: {
      x: sideKey === 'RIGHT' ? leaderMainWidthMm / 2 - 50 : -leaderMainWidthMm / 2 + 50,

      y: 650,
      z: -leaderMainDepthMm / 2 + 50,
    },

    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },

    model: {
      kind: 'native-block',
      src: null,
    },

    meta: {
      category: 'leader-supports',
      layoutType: 'LEADER',
      leaderRole: 'SURFACE_JUNCTION',
      excludeFromBOM: true,
    },
  });
  */

  // =====================================================
  // DOS LÁMINAS DE UNIÓN ENTRE SUPERFICIES
  // Código: 22000109449
  // =====================================================

  if (!leaderCredenzaEnabled) {
    const unionCenterX =
      sideKey === 'RIGHT'
        ? leaderMainWidthMm / 2 - leaderReturnDepthMm / 2
        : -leaderMainWidthMm / 2 + leaderReturnDepthMm / 2;

    const unionCenterZ = -leaderMainDepthMm / 2 + 85;
    const unionPlateSeparationMm = 190;
    const unionPlateOffsetsMm = [-unionPlateSeparationMm / 2, unionPlateSeparationMm / 2];

    unionPlateOffsetsMm.forEach((offsetMm, index) => {
      parts.push({
        type: 'leaderUnionSupport',
        subtype: 'surface-junction',
        line: 'KONCISA.PLUS',

        groupId,
        groupName,

        code: '22000109449',
        rawCodigoPT: '22000109449',

        logicalCode: `KONCISA_LEADER_UNION_SUPPORT_${index + 1}`,

        existsInCatalog: true,

        name: 'LAMINA DE UNION SUPERFICIES ACCESORIO MULTIPLE MAC390020',

        // Según la tabla:
        // largo 15 cm, alto 9 cm y profundidad 8.5 cm.
        dimMm: {
          widthMm: 150,
          heightMm: 9,
          depthMm: 85,
        },

        position: {
          x: sideKey === 'RIGHT' ? unionCenterX + offsetMm : unionCenterX - offsetMm,

          // Debe quedar debajo o contra la superficie.
          // Ajusta este valor visualmente si es necesario.
          y: 695 + 10,

          z: unionCenterZ - 90,
        },

        rotation: {
          x: 0,
          y: 0,
          z: 0,
        },

        model: {
          kind: 'native-block',
          src: null,
        },

        meta: {
          category: 'leader-supports',
          layoutType: 'LEADER',
          leaderRole: 'SURFACE_JUNCTION',

          unionPlateIndex: index,

          // Debe entrar en el BOM.
          excludeFromBOM: false,
        },
      });
    });
  }

  return {
    groupId,
    groupName,
    layoutType: 'LEADER',
    parts,
  };
}
