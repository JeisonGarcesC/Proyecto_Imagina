// src/koncisaPlus/leader/KoncisaLeaderBuilder.js

import { createLeaderMainSurface, createLeaderReturnSurface } from './parts/leaderSurfaces';
import { createCostado } from '../parts/costados';
import { createViga } from '../parts/vigas';
import { createGrommet } from '../parts/grommets';
import { createLeaderCredenzaBeamDecoration, createLeaderMainBeam } from './parts/leaderBeams';
import { createLeaderCredenza } from './parts/leaderCredenzas';
import {
  fallbackFromConfig,
  getKoncisaSurfaceComponentConfig,
  resolveKoncisaSurfaceFinishOption,
} from '../rules/koncisaSurfaceComponentRules.js';

import { resolveLeaderCostadoWithOutlet } from './rules/leaderCostadoOutletRules';
import { positionLeaderCostadoAssembly } from './rules/leaderCostadoPlacement.js';

import { createLeaderMainSkirt } from './parts/leaderSkirts';

function resolveLeaderSurfaceAccessPosition({
  position = 'CENTER',
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
  const localZ = 0; //depthMm <= 600 ? -224 : -255; //-224 : -255
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);

  const x = centerX + localX * cos + localZ * sin;
  const z = centerZ - localX * sin + localZ * cos;

  return {
    positionKey,
    localX,
    localZ,
    x,
    z,
  };
}

function suppressLeaderPasacable(componentConfig) {
  if (componentConfig.cableAccessType !== 'PASACABLE' && !componentConfig.pasacable) {
    return componentConfig;
  }
  return { ...componentConfig, cableAccessType: 'NONE', grommet: false, pasacable: false };
}

// Posición del grommet del puesto líder.
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
  positionOffsetMm = null,
  componentConfig = {},
}) {
  const resolvedPosition = resolveLeaderSurfaceAccessPosition({
    position,
    widthMm,
    depthMm,
    centerX,
    centerZ,
    rotationY,
  });
  const grommet = createGrommet({
    groupId,
    groupName,
    finish,
    layoutType: 'LEADER',
    diameterMm: 80,
    x: resolvedPosition.x + (Number(positionOffsetMm?.x) || 0),
    y: 740 + (Number(positionOffsetMm?.y) || 0),
    z: resolvedPosition.z + (Number(positionOffsetMm?.z) || 0),
    rotY: rotationY,
  });
  grommet.meta = {
    ...(grommet.meta || {}),
    layoutType: 'LEADER',
    leaderRole: `${surfaceRole}_GROMMET`,
    targetSurfaceRole: surfaceRole,
    targetSurfaceKey: `${surfaceRole}_SURFACE`,
    componentConfig,
    position: resolvedPosition.positionKey,
    localPositionMm: { x: resolvedPosition.localX, z: resolvedPosition.localZ },
  };

  return grommet;
}

function createLeaderGrommetOutletBox({
  groupId,
  groupName,
  surfaceRole,
  position = 'CENTER',
  widthMm,
  depthMm,
  centerX,
  centerZ,
  rotationY = 0,
  placement = null,
  componentConfig = null,
}) {
  const resolvedPosition = resolveLeaderSurfaceAccessPosition({
    position,
    widthMm,
    depthMm,
    centerX,
    centerZ,
    rotationY,
  });

  //console.log('leaderSide  ', leaderSide === 'RIGHT' ? 707 : -550);

  return {
    type: 'GLB_PART',
    subtype: `${String(surfaceRole || '').toLowerCase()}-surface-grommet-outlet-box`,
    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: '22000135010',
    rawCodigoPT: '22000135010',
    logicalCode: 'LKAC842000',
    existsInCatalog: true,
    name: 'CAJA TOMAS PARA SUPERFICIES RETORNO CON GROMMET',

    dimMm: {
      widthMm: 80,
      heightMm: 150,
      depthMm: 60,
    },
    position: {
      x: Number(placement?.position?.x) || 0,
      y: Number(placement?.position?.y) || 0,
      z: Number(placement?.position?.z) || 0,
    },

    rotation: {
      x: Number(placement?.rotation?.x) || 0,
      y: Number(placement?.rotation?.y) || 0,
      z: Number(placement?.rotation?.z) || 0,
    },

    model: {
      kind: 'glb',
      src: '/assets/models/koncisaPlus/22000135010.glb',
    },

    meta: {
      category: 'cajas-de-tomas',
      layoutType: 'LEADER',
      leaderRole: `${surfaceRole}_GROMMET_OUTLET_BOX`,
      targetSurfaceRole: surfaceRole,
      targetSurfaceKey: `${surfaceRole}_SURFACE`,
      componentKey: `${surfaceRole}_SURFACE`,
      componentConfig,
      position: resolvedPosition.positionKey,
      localPositionMm: { x: resolvedPosition.localX, z: resolvedPosition.localZ },
      modelCode: 'CAJA_TOMAS_COSTADO',
      pairedWithGrommet: true,
    },
  };
}

function createLeaderOutletWallCoupling({ groupId, groupName, targetRole, placement = null }) {
  return {
    type: 'GLB_PART',
    subtype: 'leader-outlet-wall-coupling',
    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: '22000137143',
    rawCodigoPT: '22000137143',
    logicalCode: '2KAC281000',
    existsInCatalog: true,
    name: 'ACOPLE CAJA TOMAS A PARED',

    dimMm: {
      widthMm: 230,
      heightMm: 85,
      depthMm: 45,
    },

    position: {
      x: Number(placement?.position?.x) || 0,
      y: Number(placement?.position?.y) || 0,
      z: Number(placement?.position?.z) || 0,
    },

    rotation: {
      x: Number(placement?.rotation?.x) || 0,
      y: Number(placement?.rotation?.y) || 0,
      z: Number(placement?.rotation?.z) || 0,
    },

    model: {
      kind: 'glb',
      src: '/assets/models/koncisaPlus/22000137143.glb',
    },

    meta: {
      category: 'acoples-caja-tomas',
      layoutType: 'LEADER',
      leaderRole: `${targetRole}_OUTLET_WALL_COUPLING`,
      targetRole,
      targetSurfaceRole: targetRole,
      targetSurfaceKey: `${targetRole}_SURFACE`,
      pairedWithOutletBox: true,
      modelCode: '2KAC281000',
    },
  };
}

function createLeaderFloorDuct({
  groupId,
  groupName,
  surfaceRole,
  position = 'CENTER',
  widthMm,
  depthMm,
  centerX,
  centerZ,
  rotationY = 0,
  placement = null,
}) {
  const resolvedPosition = resolveLeaderSurfaceAccessPosition({
    position,
    widthMm,
    depthMm,
    centerX,
    centerZ,
    rotationY,
  });

  return {
    type: 'ductoPiso',
    subtype: 'leader-floor-duct',
    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: '22000104949',
    rawCodigoPT: '22000104949',
    logicalCode: 'TKAC120000',
    existsInCatalog: true,
    name: 'DUCTO BAJANTE DE PISO TKAC120000',

    dimMm: {
      widthMm: 100,
      heightMm: 500,
      depthMm: 100,
    },
    // La ubicación se define de forma independiente para MAIN y RETURN.
    position: {
      x: Number(placement?.position?.x) || 0,
      y: Number(placement?.position?.y) || 0,
      z: Number(placement?.position?.z) || 0,
    },

    rotation: {
      x: Number(placement?.rotation?.x) || 0,
      y: Number(placement?.rotation?.y) || 0,
      z: Number(placement?.rotation?.z) || 0,
    },

    model: {
      kind: 'glb',
      src: '/assets/models/koncisaPlus/22000104949.glb',
    },

    meta: {
      category: 'ductos-a-piso',
      layoutType: 'LEADER',
      leaderRole: `${surfaceRole}_FLOOR_DUCT`,
      targetSurfaceRole: surfaceRole,
      targetSurfaceKey: `${surfaceRole}_SURFACE`,
      position: resolvedPosition.positionKey,
      localPositionMm: { x: resolvedPosition.localX, z: resolvedPosition.localZ },
      modelCode: '22000104949',
    },
  };
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

    leaderHasGrommetBox = false,
    leaderMainFloorDuct = null,
    leaderReturnFloorDuct = null,
    leaderMainOutletCoupling = null,
    leaderReturnOutletCoupling = null,
    leaderCostadoOutletCoupling = null,
    leaderCostadoFloorDuct = null,

    // Falda principal
    leaderHasSkirt = false,

    leaderSkirtMaterialType = 'METALICA',

    leaderSkirtFinishCode = null,
  } = config;

  const parts = [];
  const leaderCredenzaEnabled = leaderCredenza?.enabled === true;
  const hasLeaderJunctionOutletBox = leaderJunctionHasOutletBox === true && !leaderCredenzaEnabled;
  const surfaceFallback = fallbackFromConfig(config);
  if (surfaceFallback.cableAccessType === 'GROMMET') {
    surfaceFallback.cableAccessType = 'NONE';
    surfaceFallback.grommet = false;
  }
  const resolvedMainComponentConfig = suppressLeaderPasacable(
    getKoncisaSurfaceComponentConfig(config, 'MAIN_SURFACE', {
      ...surfaceFallback,
      floorDuctEnabled: leaderMainFloorDuct?.enabled === true,
      outletCouplingEnabled: leaderMainOutletCoupling?.enabled === true,
    })
  );
  const mainComponentConfig = {
    ...resolvedMainComponentConfig,
    ...(leaderCredenzaEnabled ? {} : { cableAccessType: 'NONE', grommet: false, pasacable: false }),
  };
  const returnComponentConfig = suppressLeaderPasacable(
    getKoncisaSurfaceComponentConfig(config, 'RETURN_SURFACE', {
      ...surfaceFallback,
      floorDuctEnabled: leaderReturnFloorDuct?.enabled === true,
      outletCouplingEnabled: leaderReturnOutletCoupling?.enabled === true,
    })
  );
  const mainFinish = resolveKoncisaSurfaceFinishOption(mainComponentConfig, surfaceFallback);
  const materialTypeFor = (option) => (option.id.startsWith('FORM') ? 'FORMICA' : 'MELAMINA');

  const sideKey =
    String(leaderSide || 'RIGHT')
      .trim()
      .toUpperCase() === 'LEFT'
      ? 'LEFT'
      : 'RIGHT';
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
    thickMm: mainFinish.thickMm,

    materialType: materialTypeFor(mainFinish) || leaderMaterialType,
    finishCode: mainFinish.finishCode,

    x: 0,
    y: 710,
    z: 0,
  });

  mainSurface.meta = {
    ...(mainSurface.meta || {}),
    componentKey: 'MAIN_SURFACE',
    componentConfig: mainComponentConfig,
    allowMainGrommet: leaderCredenzaEnabled,
  };
  mainSurface.componentKey = 'MAIN_SURFACE';
  mainSurface.componentConfig = mainComponentConfig;

  parts.push(mainSurface);

  const shouldCreateMainGrommet = leaderCredenzaEnabled
    ? mainComponentConfig.grommet
    : hasLeaderJunctionOutletBox;
  if (shouldCreateMainGrommet) {
    parts.push(
      createLeaderSurfaceGrommet({
        groupId,
        groupName,
        surfaceRole: 'MAIN',
        position: mainComponentConfig.grommetPosition,
        finish: mainComponentConfig.grommetFinish,
        widthMm: leaderMainWidthMm,
        depthMm: leaderMainDepthMm,
        centerX: mainSurface.position.x,
        centerZ: mainSurface.position.z,
        rotationY: mainSurface.rotation.y + Math.PI / 2, //Math.PI / 2 cambiar la rotacion
        componentConfig: {
          ...mainComponentConfig,
          cableAccessType: 'GROMMET',
          grommet: true,
        },
        positionOffsetMm: {
          x: sideKey === 'LEFT' ? -647 : 647, //870, // mueve hacia los lados
          y: 0, // sube o baja
          z: 0, // mueve hacia el frente o fondo
        },
      })
    );

    if (!leaderCredenzaEnabled && !leaderJunctionHasOutletBox) {
      parts.push(
        createLeaderGrommetOutletBox({
          groupId,
          groupName,
          surfaceRole: 'MAIN',
          position: 'CENTER',
          widthMm: leaderMainWidthMm,
          depthMm: leaderMainDepthMm,
          centerX: mainSurface.position.x,
          centerZ: mainSurface.position.z,
          rotationY: mainSurface.rotation.y,
          componentConfig: mainComponentConfig,
          placement: {
            // Posición manual de la caja de tomas de la superficie principal.
            position: {
              x: 738 - 184,
              y: 558,
              z: -223,
            },
            rotation: {
              x: 0,
              y: -Math.PI / 2,
              z: 0,
            },
          },
        })
      );
    }

    if (mainComponentConfig.outletCouplingEnabled) {
      parts.push(
        createLeaderOutletWallCoupling({
          groupId,
          groupName,
          targetRole: 'MAIN',
          placement: {
            // Posición manual del acople de la superficie principal.
            position: {
              x: 0,
              y: 0,
              z: 0,
            },
            rotation: {
              x: 0, //Math.PI / 2,
              y: 0,
              z: 0,
            },
          },
        })
      );
    }
  }

  if (
    !leaderCredenzaEnabled &&
    mainComponentConfig.grommet &&
    mainComponentConfig.floorDuctEnabled
  ) {
    parts.push(
      createLeaderFloorDuct({
        groupId,
        groupName,
        surfaceRole: 'MAIN',
        position: leaderMainFloorDuct?.position ?? mainComponentConfig.grommetPosition,
        widthMm: leaderMainWidthMm,
        depthMm: leaderMainDepthMm,
        centerX: mainSurface.position.x,
        centerZ: mainSurface.position.z,
        rotationY: mainSurface.rotation.y,
        placement: {
          // Posición manual del ducto bajo la superficie principal.
          position: {
            x: 600 + 60,
            y: 0,
            z: 53,
          },
          rotation: {
            x: 0,
            y: 1.575,
            z: 0,
          },
        },
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

      hasGrommetBox: returnComponentConfig.grommet,
    });

    returnSurface.meta = {
      ...(returnSurface.meta || {}),
      componentKey: 'RETURN_SURFACE',
      componentConfig: returnComponentConfig,
    };
    returnSurface.componentKey = 'RETURN_SURFACE';
    returnSurface.componentConfig = returnComponentConfig;

    parts.push(returnSurface);

    const returnGrommetEnabled = returnComponentConfig.grommet;
    if (returnGrommetEnabled) {
      const accessPosition = resolveLeaderSurfaceAccessPosition({
        position: returnComponentConfig.grommetPosition,
        widthMm: leaderReturnLengthMm,
        depthMm: leaderReturnDepthMm,
        centerX: returnSurface.position.x,
        centerZ: returnSurface.position.z,
        rotationY: returnSurface.rotation.y,
      });
      // Las ubicaciones manuales de caja y acople corresponden a CENTER.
      // El mismo desplazamiento del grommet conserva su relación física.
      const accessOffsetX = accessPosition.localX * Math.cos(returnSurface.rotation.y);
      const accessOffsetZ = -accessPosition.localX * Math.sin(returnSurface.rotation.y);
      const movimientoz = 189; //positionKey === 'LEFT' ? 189 : positionKey === 'RIGHT' ? -189 * 2 : 0;
      parts.push(
        createLeaderSurfaceGrommet({
          groupId,
          groupName,
          surfaceRole: 'RETURN',
          position: returnComponentConfig.grommetPosition,
          finish: Object.hasOwn(config.surfaceOverrides?.RETURN_SURFACE || {}, 'grommetFinish')
            ? returnComponentConfig.grommetFinish
            : null,
          widthMm: leaderReturnLengthMm,
          depthMm: leaderReturnDepthMm,
          centerX: returnSurface.position.x,
          centerZ: returnSurface.position.z,
          rotationY: returnSurface.rotation.y,
          componentConfig: returnComponentConfig,
          positionOffsetMm: {
            // Cancela el desplazamiento lateral que la rotación ya aporta en Z.
            x: sideKey === 'RIGHT' ? 177 : -177,
            y: 0,
            z: movimientoz, //accessPosition.localX * Math.sin(returnSurface.rotation.y), //movimientoz, //
          },
        })
      );

      const returnOutletBox = createLeaderGrommetOutletBox({
        groupId,
        groupName,
        surfaceRole: 'RETURN',
        position: returnComponentConfig.grommetPosition,
        widthMm: leaderReturnLengthMm,
        depthMm: leaderReturnDepthMm,
        centerX: returnSurface.position.x,
        centerZ: returnSurface.position.z,
        rotationY: returnSurface.rotation.y,
        componentConfig: returnComponentConfig,
        placement: {
          // Posición manual de la caja de tomas de la superficie de retorno.
          position: {
            x: (sideKey === 'RIGHT' ? 707 : -550) + accessOffsetX,
            y: 550,
            z: -400 + 64 + accessOffsetZ,
          },
          rotation: {
            x: 0,
            y: Math.PI / 2,
            z: 0,
          },
        },
      });
      parts.push(returnOutletBox);

      if (returnComponentConfig.outletCouplingEnabled) {
        parts.push(
          createLeaderOutletWallCoupling({
            groupId,
            groupName,
            targetRole: 'RETURN',
            placement: {
              // El acople girado 90° sale por el costado +X de la caja.
              // Los orígenes de ambos GLB están en esquinas distintas.
              position: {
                x: returnOutletBox.position.x - 2.6,
                y: returnOutletBox.position.y + 123,
                z: returnOutletBox.position.z - 83.85,
              },
              rotation: {
                x: 0,
                y: Math.PI / 2,
                z: 0,
              },
            },
          })
        );
      }
    }

    if (returnComponentConfig.grommet && returnComponentConfig.floorDuctEnabled) {
      parts.push(
        createLeaderFloorDuct({
          groupId,
          groupName,
          surfaceRole: 'RETURN',
          position: leaderReturnFloorDuct?.position ?? returnComponentConfig.grommetPosition,
          widthMm: leaderReturnLengthMm,
          depthMm: leaderReturnDepthMm,
          centerX: returnSurface.position.x,
          centerZ: returnSurface.position.z,
          rotationY: returnSurface.rotation.y,
          placement: {
            // Posición manual del ducto bajo la superficie de retorno.
            position: {
              x: sideKey === 'RIGHT' ? 665 : -665, //, //sideKey === 'RIGHT' ? 0 : 750, //-665
              y: 0,
              z: -473, //-400
            },
            rotation: {
              x: 0,
              y: sideKey === 'RIGHT' ? Math.PI / 2 : -Math.PI / 2,
              z: 0,
            },
          },
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

  positionLeaderCostadoAssembly(mainTerminalCostado, {
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

  const outletResolved = hasLeaderJunctionOutletBox
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

    hasOutletBox: hasLeaderJunctionOutletBox,
    outletCouplingEnabled: leaderCostadoOutletCoupling?.enabled === true,
    floorDuctEnabled: leaderCostadoFloorDuct?.enabled === true,

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

  positionLeaderCostadoAssembly(junctionCostado, {
    x: junctionCostadoX,
    y: 0,
    z: 0,
  });

  junctionCostado.replaceKey = `KONCISA_LEADER_MAIN_RETURN_${sideKey}`;

  if (!leaderCredenzaEnabled) {
    parts.push(junctionCostado);

    // Si está activada y existe la regla, sustituye solo los datos comerciales.
    if (hasLeaderJunctionOutletBox && outletResolved?.exists) {
      junctionCostado.code = outletResolved.codigoPT;

      junctionCostado.rawCodigoPT = outletResolved.codigoPT;

      junctionCostado.logicalCode = outletResolved.logicalCode;

      junctionCostado.existsInCatalog = true;

      junctionCostado.name = outletResolved.isSpecial
        ? `${outletResolved.descriptionPrefix} Costado ${leaderMainCostadoForma} con caja de tomas ${outletResolved.billingDepthMm} - ${outletResolved.descriptionSuffix}`
        : `Costado ${leaderMainCostadoForma} con caja de tomas ${outletResolved.billingDepthMm}`;
    }

    if (hasLeaderJunctionOutletBox && leaderCostadoOutletCoupling?.enabled === true) {
      parts.push(
        createLeaderOutletWallCoupling({
          groupId,
          groupName,
          targetRole: 'COSTADO',
          placement: {
            // Posición manual del acople asociado a la caja del costado.
            position: {
              x: 745, //sideKey === 'RIGHT' ? 0 : -0,
              y: 655,
              z: 139,
            },
            rotation: {
              x: 0,
              y: Math.PI / 2, //sideKey === 'RIGHT' ? 0 : -0,
              z: 0,
            },
          },
        })
      );
    }

    if (hasLeaderJunctionOutletBox && leaderCostadoFloorDuct?.enabled === true) {
      const floorDuct = createLeaderFloorDuct({
        groupId,
        groupName,
        surfaceRole: 'COSTADO',
        position: 'CENTER',
        widthMm: leaderMainDepthMm,
        depthMm: leaderMainDepthMm,
        centerX: junctionCostado.position.x,
        centerZ: junctionCostado.position.z,
        rotationY: Math.PI / 2,
        placement: {
          position: {
            x: junctionCostado.position.x + (sideKey === 'RIGHT' ? -300 : 300),
            y: 0,
            z: sideKey === 'RIGHT' ? -leaderMainDepthMm / 2 + 105.1 : leaderMainDepthMm / 2 - 105.1,
          },
          rotation: { x: 0, y: Math.PI / 2, z: 0 },
        },
      });
      floorDuct.meta.targetSurfaceRole = 'MAIN_RETURN_JUNCTION';
      floorDuct.meta.targetSurfaceKey = 'MAIN_RETURN_JUNCTION';
      parts.push(floorDuct);
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

    positionLeaderCostadoAssembly(returnTerminalCostado, {
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
