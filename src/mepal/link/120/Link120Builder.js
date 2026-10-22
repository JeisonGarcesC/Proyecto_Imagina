import { linkPart } from '../parts/linkParts.js';
import { resolveLink120SurfaceCode, LINK_120_SUPPORTS, getLink120WingLayout } from './rules/link120Rules.js';
import { LINK_GROMMET_RULES } from '../rules/linkCableAccessRules.js';
import { linkComponentConfig } from '../rules/linkComponentRules.js';
import { createCostado } from '../parts/costados.js';
import { createDucto, createDuctAccessories } from '../parts/ductos.js';

export function buildLink120(config) {
  const parts = [];
  const bomExtras = [];
  const depthMm = config.depthMm >= 700 ? 750 : 600;
  const disp = config.disposicion120 || 'individual';
  const hasGrommet = config.cableAccess === 'grommet';
  const grommetSide = config.grommetSide120 || config.grommetSide || 'izquierda';
  const hasDuct = config.hasDuct !== false;
  const surfaceHeight = 710;
  const thickMm = 30;
  const lengthScale = depthMm / 600;

  // Medidas oficiales de la mesa de 120° (LKSU030010 / LKSU030030)
  const L = 1297;
  const L_wing = 1296;

  const costadoTerminalCode = LINK_120_SUPPORTS.costadoSencillo[depthMm]?.code;
  const costadoDobleCode = LINK_120_SUPPORTS.costadoDoble[depthMm >= 700 ? 1500 : 1200]?.code;
  const sup240 = LINK_120_SUPPORTS.soporte240;
  const sup360 = LINK_120_SUPPORTS.soporte360;
  const ductCode = LINK_120_SUPPORTS.ductoDoble[1200]?.code;
  const grommetCode = LINK_GROMMET_RULES.standard[config.grommetFinish || 'ALUMINIUM'];
  // Centrar la mesa en el origen X
  const baseX = -900;

  if (disp === '360') {
    // Conjunto 360° (3 puestos a 120° en disposición circular simétrica / tríada)
    // 3 puestos unidos en 3 conexiones (brazos) a 120° entre sí:
    // - Arm 1 (espina base hacia -X, conexión entre Puesto 1 y Puesto 2)
    // - Arm 2 (brazo a +60°, conexión entre Puesto 2 y Puesto 3)
    // - Arm 3 (brazo a -60°, conexión entre Puesto 3 y Puesto 1)
    // Cada conexión cuenta con ducto cableado doble debajo y grommet doble arriba.
    const codeIzq = resolveLink120SurfaceCode(depthMm, 'izquierda');
    const codeDer = resolveLink120SurfaceCode(depthMm, 'derecha');

    // 1. Superficie izquierda (Z < 0) del puesto doble
    const surfaceKey1 = 'surface-120-0';
    const surfaceComponent1 = linkComponentConfig(config, surfaceKey1, {
      finishId: config.finishId,
      grommet: config.cableAccess === 'grommet',
      grommetFinish: config.grommetFinish || 'ALUMINIUM',
      grommetSide120: config.grommetSide120 || config.grommetSide || 'izquierda',
    });
    const hasGrommet1 = Boolean(surfaceComponent1.grommet);

    parts.push(linkPart('SURFACE', surfaceKey1, [L, thickMm, depthMm],
      [baseX, surfaceHeight + thickMm / 2, 0], codeIzq, `Superficie 120° puesto 1`,
      {
        rotationY: 0,
        is120: true,
        side: 'izquierda',
        depthMm,
        hasGrommet: hasGrommet1,
        grommetSide: surfaceComponent1.grommetSide120 || 'izquierda',
        componentConfig: surfaceComponent1,
        configTargetKey: surfaceKey1,
        parentComponentKey: surfaceKey1,
        L,
        L_wing,
        cornerR: 130,
        gap: 26,
        meta: { category: 'superficies' },
      }));

    // 2. Superficie derecha (Z > 0) del puesto doble
    const surfaceKey2 = 'surface-120-1';
    const surfaceComponent2 = linkComponentConfig(config, surfaceKey2, {
      finishId: config.finishId,
      grommet: config.cableAccess === 'grommet',
      grommetFinish: config.grommetFinish || 'ALUMINIUM',
      grommetSide120: config.grommetSide120 || config.grommetSide || 'izquierda',
    });
    const hasGrommet2 = Boolean(surfaceComponent2.grommet);

    parts.push(linkPart('SURFACE', surfaceKey2, [L, thickMm, depthMm],
      [baseX, surfaceHeight + thickMm / 2, 0], codeDer, `Superficie 120° puesto 2`,
      {
        rotationY: 0,
        is120: true,
        side: 'derecha',
        depthMm,
        hasGrommet: hasGrommet2,
        grommetSide: surfaceComponent2.grommetSide120 || 'izquierda',
        componentConfig: surfaceComponent2,
        configTargetKey: surfaceKey2,
        parentComponentKey: surfaceKey2,
        L,
        L_wing,
        cornerR: 130,
        gap: 26,
        meta: { category: 'superficies' },
      }));

    // 3. Tercera superficie integrada en la bifurcación (en el espacio entre las dos alas)
    const surfaceKey3 = 'surface-120-2';
    const surfaceComponent3 = linkComponentConfig(config, surfaceKey3, {
      finishId: config.finishId,
      grommet: config.cableAccess === 'grommet',
      grommetFinish: config.grommetFinish || 'ALUMINIUM',
      grommetSide120: config.grommetSide120 || config.grommetSide || 'izquierda',
    });
    const hasGrommet3 = Boolean(surfaceComponent3.grommet);

    // Posición y rotación exacta para que sus dos espinas acoplen con las alas izquierda y derecha con gap 26 mm
    const pxC = baseX + 1.5 * L - (6.5 / Math.sqrt(3));
    const pzC = -L * (Math.sqrt(3) / 2) - 6.5;
    const rotYC = -2 * Math.PI / 3;

    parts.push(linkPart('SURFACE', surfaceKey3, [L, thickMm, depthMm],
      [pxC, surfaceHeight + thickMm / 2, pzC], codeIzq, `Superficie 120° puesto 3`,
      {
        rotationY: rotYC,
        is120: true,
        side: 'izquierda',
        depthMm,
        hasGrommet: hasGrommet3,
        grommetSide: surfaceComponent3.grommetSide120 || 'izquierda',
        componentConfig: surfaceComponent3,
        configTargetKey: surfaceKey3,
        parentComponentKey: surfaceKey3,
        L,
        L_wing,
        cornerR: 130,
        gap: 26,
        meta: { category: 'superficies' },
      }));

    // Soporte central 360° en el vértice de bifurcación que conecta los 3 grommets (ELSO110000 / LKSO110000 / 22000011409)
    parts.push(linkPart('SUPPORT', 'central-support-360', [360, 710, 310],
      [baseX + L, 355, 0], sup360.code, sup360.description,
      {
        rotationY: 0,
        is120: true,
        logicalCode: sup360.logicalCode,
        model: { kind: 'glb', src: sup360.modelSrc, exactSize: true },
        meta: { category: 'soportes' },
      }));

    // Costados dobles en los 3 extremos del conjunto (cada extremo mide depthMm * 2 + 26):
    // 1. Costado base del puesto doble (retranqueado 32 mm si terminal, 0 mm si intermedio)
    const isTerminalBase360 = config.components?.['support-360-base']?.terminal !== undefined
      ? Boolean(config.components['support-360-base'].terminal)
      : true;
    const hasBaseTapa360 = hasDuct && isTerminalBase360 && (
      config.components?.['duct-0']?.coverLeft !== undefined
        ? Boolean(config.components['duct-0'].coverLeft)
        : (config.components?.['support-360-base']?.hasTapa !== undefined
            ? Boolean(config.components['support-360-base'].hasTapa)
            : true)
    );
    const baseCostado360 = createCostado({
      config: { ...config, type: 'doble' },
      key: 'support-360-base',
      terminal: isTerminalBase360,
      depthMm: depthMm * 2 + 26,
      ruleDepthMm: depthMm,
      position: [isTerminalBase360 ? (baseX + 32) : baseX, 355, 0],
      rotationY: Math.PI / 2, // Soportes de viga hacia adentro (+X) y tapa del ducto hacia afuera (-X)
      lengthScale,
      hasTapa: hasBaseTapa360,
    });
    if (baseCostado360) parts.push(baseCostado360);

    // 2. Costado doble en el extremo del ala derecha (soporte de viga hacia adentro al centro 240°)
    const isTerminalWingDer360 = config.components?.['support-360-wing-der']?.terminal !== undefined
      ? Boolean(config.components['support-360-wing-der'].terminal)
      : true;
    const hasWingDerTapa360 = hasDuct && isTerminalWingDer360 && (
      config.components?.['duct-1']?.coverRight !== undefined
        ? Boolean(config.components['duct-1'].coverRight)
        : (config.components?.['support-360-wing-der']?.hasTapa !== undefined
            ? Boolean(config.components['support-360-wing-der'].hasTapa)
            : true)
    );
    const wingEndDistDer = isTerminalWingDer360 ? (L_wing - 32) : L_wing;
    const wingDerMidX = baseX + L + wingEndDistDer * 0.5;
    const wingDerMidZ = wingEndDistDer * (Math.sqrt(3) / 2);
    const wingDerCostado360 = createCostado({
      config: { ...config, type: 'doble' },
      key: 'support-360-wing-der',
      terminal: isTerminalWingDer360,
      depthMm: depthMm * 2 + 26,
      ruleDepthMm: depthMm,
      position: [wingDerMidX, 355, wingDerMidZ],
      rotationY: -Math.PI / 6, // Soportes de viga apuntando hacia el centro
      lengthScale,
      hasTapa: hasWingDerTapa360,
    });
    if (wingDerCostado360) parts.push(wingDerCostado360);

    // 3. Costado doble en el extremo del ala izquierda (soporte de viga hacia adentro al centro 120°)
    const isTerminalWingIzq360 = config.components?.['support-360-wing-izq']?.terminal !== undefined
      ? Boolean(config.components['support-360-wing-izq'].terminal)
      : true;
    const hasWingIzqTapa360 = hasDuct && isTerminalWingIzq360 && (
      config.components?.['duct-2']?.coverRight !== undefined
        ? Boolean(config.components['duct-2'].coverRight)
        : (config.components?.['support-360-wing-izq']?.hasTapa !== undefined
            ? Boolean(config.components['support-360-wing-izq'].hasTapa)
            : true)
    );
    const wingEndDistIzq = isTerminalWingIzq360 ? (L_wing - 32) : L_wing;
    const wingIzqMidX = baseX + L + wingEndDistIzq * 0.5;
    const wingIzqMidZ = -wingEndDistIzq * (Math.sqrt(3) / 2);
    const wingIzqCostado360 = createCostado({
      config: { ...config, type: 'doble' },
      key: 'support-360-wing-izq',
      terminal: isTerminalWingIzq360,
      depthMm: depthMm * 2 + 26,
      ruleDepthMm: depthMm,
      position: [wingIzqMidX, 355, wingIzqMidZ],
      rotationY: -5 * Math.PI / 6, // Soportes de viga apuntando hacia el centro
      lengthScale,
      hasTapa: hasWingIzqTapa360,
    });
    if (wingIzqCostado360) parts.push(wingIzqCostado360);

    // Grommets en los puestos del conjunto 360° (espina y/o ala según grommetSide120)
    const sin60 = Math.sqrt(3) / 2;
    const grommetDist = 83;

    const sideGrommet1 = surfaceComponent1.grommetSide120 || config.grommetSide120 || config.grommetSide || 'izquierda';
    const sideGrommet2 = surfaceComponent2.grommetSide120 || config.grommetSide120 || config.grommetSide || 'izquierda';
    const sideGrommet3 = surfaceComponent3.grommetSide120 || config.grommetSide120 || config.grommetSide || 'izquierda';

    const grommetFinish1 = surfaceComponent1.grommetFinish || config.grommetFinish || 'ALUMINIUM';
    const grommetFinish2 = surfaceComponent2.grommetFinish || config.grommetFinish || 'ALUMINIUM';
    const grommetFinish3 = surfaceComponent3.grommetFinish || config.grommetFinish || 'ALUMINIUM';

    const grommetCode1 = LINK_GROMMET_RULES.standard[grommetFinish1] || LINK_GROMMET_RULES.standard.ALUMINIUM;
    const grommetCode2 = LINK_GROMMET_RULES.standard[grommetFinish2] || LINK_GROMMET_RULES.standard.ALUMINIUM;
    const grommetCode3 = LINK_GROMMET_RULES.standard[grommetFinish3] || LINK_GROMMET_RULES.standard.ALUMINIUM;

    // Puesto 1 (surfaceKey1 = 'surface-120-0', izquierda)
    if (hasGrommet1 && (sideGrommet1 === 'izquierda' || sideGrommet1 === 'ambos')) {
      parts.push(linkPart('GROMMET', 'grommet-360-spine-izq', [510, 30, 100],
        [baseX + 600, surfaceHeight + thickMm / 2, -83], grommetCode1, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
        {
          rotationY: Math.PI,
          model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
          componentConfig: surfaceComponent1,
          configTargetKey: surfaceKey1,
          parentComponentKey: surfaceKey1,
          is120: true,
          meta: { category: 'accesorios' },
        }));
    }
    if (hasGrommet1 && (sideGrommet1 === 'derecha' || sideGrommet1 === 'ambos')) {
      const cPhysX = L + 300 - grommetDist * sin60;
      const cPhysZ = -13 - (600 * sin60 + grommetDist * 0.5);
      parts.push(linkPart('GROMMET', 'grommet-360-wing-izq', [510, 30, 100],
        [baseX + cPhysX, surfaceHeight + thickMm / 2, cPhysZ], grommetCode1, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
        {
          rotationY: Math.PI / 3,
          model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
          componentConfig: surfaceComponent1,
          configTargetKey: surfaceKey1,
          parentComponentKey: surfaceKey1,
          is120: true,
          meta: { category: 'accesorios' },
        }));
    }

    // Puesto 2 (surfaceKey2 = 'surface-120-1', derecha)
    if (hasGrommet2 && (sideGrommet2 === 'izquierda' || sideGrommet2 === 'ambos')) {
      parts.push(linkPart('GROMMET', 'grommet-360-spine-der', [510, 30, 100],
        [baseX + 600, surfaceHeight + thickMm / 2, 83], grommetCode2, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
        {
          rotationY: 0,
          model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
          componentConfig: surfaceComponent2,
          configTargetKey: surfaceKey2,
          parentComponentKey: surfaceKey2,
          is120: true,
          meta: { category: 'accesorios' },
        }));
    }
    if (hasGrommet2 && (sideGrommet2 === 'derecha' || sideGrommet2 === 'ambos')) {
      const cPhysX = L + 300 - grommetDist * sin60;
      const cPhysZ = 13 + (600 * sin60 + grommetDist * 0.5);
      parts.push(linkPart('GROMMET', 'grommet-360-wing-der', [510, 30, 100],
        [baseX + cPhysX, surfaceHeight + thickMm / 2, cPhysZ], grommetCode2, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
        {
          rotationY: -Math.PI / 3,
          model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
          componentConfig: surfaceComponent2,
          configTargetKey: surfaceKey2,
          parentComponentKey: surfaceKey2,
          is120: true,
          meta: { category: 'accesorios' },
        }));
    }

    // Puesto 3 (surfaceKey3 = 'surface-120-2', tercera mesa del cluster 360°)
    const toWorld3 = (lx, lz) => [
      pxC + lx * Math.cos(rotYC) + lz * Math.sin(rotYC),
      pzC - lx * Math.sin(rotYC) + lz * Math.cos(rotYC),
    ];

    if (hasGrommet3 && (sideGrommet3 === 'izquierda' || sideGrommet3 === 'ambos')) {
      const [g3SpineX, g3SpineZ] = toWorld3(600, -83);
      parts.push(linkPart('GROMMET', 'grommet-360-spine-3', [510, 30, 100],
        [g3SpineX, surfaceHeight + thickMm / 2, g3SpineZ], grommetCode3, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
        {
          rotationY: rotYC + Math.PI,
          model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
          componentConfig: surfaceComponent3,
          configTargetKey: surfaceKey3,
          parentComponentKey: surfaceKey3,
          is120: true,
          meta: { category: 'accesorios' },
        }));
    }
    if (hasGrommet3 && (sideGrommet3 === 'derecha' || sideGrommet3 === 'ambos')) {
      const lx = L + 300 - grommetDist * sin60;
      const lz = -13 - (600 * sin60 + grommetDist * 0.5);
      const [g3WingX, g3WingZ] = toWorld3(lx, lz);
      parts.push(linkPart('GROMMET', 'grommet-360-wing-3', [510, 30, 100],
        [g3WingX, surfaceHeight + thickMm / 2, g3WingZ], grommetCode3, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
        {
          rotationY: rotYC + Math.PI / 3,
          model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
          componentConfig: surfaceComponent3,
          configTargetKey: surfaceKey3,
          parentComponentKey: surfaceKey3,
          is120: true,
          meta: { category: 'accesorios' },
        }));
    }

    // Ductos cableados: 3 ductos dobles que llegan exactamente a las bocas de integración de LKSO110000 sin traspasarlo
    if (hasDuct) {
      const ductLen360 = 1150;
      const centerDuctDist = 115 + ductLen360 / 2; // 690 mm
      const arm2CenterX = baseX + L + centerDuctDist * 0.5;
      const arm2CenterZ = centerDuctDist * (Math.sqrt(3) / 2);
      const arm3CenterX = baseX + L + centerDuctDist * 0.5;
      const arm3CenterZ = -centerDuctDist * (Math.sqrt(3) / 2);

      // Ducto 1: Espina base (hacia -X) desde el costado base hasta la boca de integración de LKSO110000
      const duct1 = createDucto({
        config: { ...config, type: 'doble', widthMm: ductLen360 },
        moduleIndex: 0,
        x: baseX + 32 + ductLen360 / 2,
        z: 0,
        key: 'duct-0',
        rotationY: 0,
      });
      if (duct1) {
        parts.push(duct1, ...createDuctAccessories({ ...config, type: 'doble', widthMm: ductLen360 }, duct1));
      }

      // Ducto 2: Brazo a +60°
      const duct2 = createDucto({
        config: { ...config, type: 'doble', widthMm: ductLen360 },
        moduleIndex: 1,
        x: arm2CenterX,
        z: arm2CenterZ,
        key: 'duct-1',
        rotationY: -Math.PI / 3,
      });
      if (duct2) {
        parts.push(duct2);
      }

      // Ducto 3: Brazo a -60°
      const duct3 = createDucto({
        config: { ...config, type: 'doble', widthMm: ductLen360 },
        moduleIndex: 2,
        x: arm3CenterX,
        z: arm3CenterZ,
        key: 'duct-2',
        rotationY: Math.PI / 3,
      });
      if (duct3) {
        parts.push(duct3);
      }
    }

    return {
      parts: parts.filter(Boolean),
      bomExtras,
      layout: { surfaceDepthMm: depthMm, gapMm: 26, totalDepthMm: (L + depthMm) * 2, centersZMm: [0] },
      leader: false,
      bounds: { widthMm: 2500, depthMm: (depthMm + L) * 2 },
    };
  }

  if (disp === 'doble') {
    // Puesto doble a 120° en Y (Bifurcación Y - exactamente Foto 2 / Plano pág. 23)
    const codeIzq = resolveLink120SurfaceCode(depthMm, 'izquierda');
    const codeDer = resolveLink120SurfaceCode(depthMm, 'derecha');
    const surfaceKeyIzq = 'surface-120-izq';
    const surfaceKeyDer = 'surface-120-der';

    const surfaceComponentIzq = linkComponentConfig(config, surfaceKeyIzq, {
      finishId: config.finishId,
      grommet: config.cableAccess === 'grommet',
      grommetFinish: config.grommetFinish || 'ALUMINIUM',
      grommetSide120: config.grommetSide120 || config.grommetSide || 'izquierda',
    });

    const surfaceComponentDer = linkComponentConfig(config, surfaceKeyDer, {
      finishId: config.finishId,
      grommet: config.cableAccess === 'grommet',
      grommetFinish: config.grommetFinish || 'ALUMINIUM',
      grommetSide120: config.grommetSide120 || config.grommetSide || 'izquierda',
    });

    const hasGrommetIzq = Boolean(surfaceComponentIzq.grommet);
    const hasGrommetDer = Boolean(surfaceComponentDer.grommet);
    const sideGrommetIzq = surfaceComponentIzq.grommetSide120 || 'izquierda';
    const sideGrommetDer = surfaceComponentDer.grommetSide120 || 'izquierda';

    // Superficie izquierda (Z < 0)
    parts.push(linkPart('SURFACE', surfaceKeyIzq, [L, thickMm, depthMm],
      [baseX, surfaceHeight + thickMm / 2, 0], codeIzq, `Superficie 120° izquierda`,
      {
        rotationY: 0,
        is120: true,
        side: 'izquierda',
        depthMm,
        hasGrommet: hasGrommetIzq,
        grommetSide: sideGrommetIzq,
        componentConfig: surfaceComponentIzq,
        configTargetKey: surfaceKeyIzq,
        parentComponentKey: surfaceKeyIzq,
        L,
        L_wing,
        cornerR: 130,
        gap: 26,
        meta: { category: 'superficies' },
      }));

    // Superficie derecha (Z > 0)
    parts.push(linkPart('SURFACE', surfaceKeyDer, [L, thickMm, depthMm],
      [baseX, surfaceHeight + thickMm / 2, 0], codeDer, `Superficie 120° derecha`,
      {
        rotationY: 0,
        is120: true,
        side: 'derecha',
        depthMm,
        hasGrommet: hasGrommetDer,
        grommetSide: sideGrommetDer,
        componentConfig: surfaceComponentDer,
        configTargetKey: surfaceKeyDer,
        parentComponentKey: surfaceKeyDer,
        L,
        L_wing,
        cornerR: 130,
        gap: 26,
        meta: { category: 'superficies' },
      }));

    // Costado doble en la base X = baseX (retranqueado 30 mm si terminal, 0 mm si intermedio)
    const isTerminalBase = config.components?.['support-120-base']?.terminal !== undefined
      ? Boolean(config.components['support-120-base'].terminal)
      : true;
    const hasBaseTapa = hasDuct && isTerminalBase && (
      config.components?.['duct-0']?.coverLeft !== undefined
        ? Boolean(config.components['duct-0'].coverLeft)
        : (config.components?.['support-120-base']?.hasTapa !== undefined
            ? Boolean(config.components['support-120-base'].hasTapa)
            : true)
    );
    const baseCostado120 = createCostado({
      config: { ...config, type: 'doble' },
      key: 'support-120-base',
      terminal: isTerminalBase,
      depthMm: depthMm * 2 + 26,
      ruleDepthMm: depthMm,
      position: [isTerminalBase ? (baseX + 32) : baseX, 355, 0],
      rotationY: Math.PI / 2, // Soportes de viga hacia adentro (+X) y tapa del ducto hacia afuera
      lengthScale,
      hasTapa: hasBaseTapa,
    });
    if (baseCostado120) parts.push(baseCostado120);

    // Soporte 240° central en la bifurcación (ELSO740000 / 22000129157) al revés (girado 180°)
    parts.push(linkPart('SUPPORT', 'support-120-center-240', sup240.dimensions,
      [baseX + L, 355, 0], sup240.code, sup240.description,
      {
        rotationY: Math.PI,
        is120: true,
        logicalCode: sup240.logicalCode,
        model: { kind: 'glb', src: sup240.modelSrc, exactSize: true },
        meta: { category: 'soportes' },
      }));

    // Costados sencillos en los extremos exteriores de las alas
    const isTerminalWingDer = config.components?.['support-120-wing-der']?.terminal !== undefined
      ? Boolean(config.components['support-120-wing-der'].terminal)
      : true;
    const isTerminalWingIzq = config.components?.['support-120-wing-izq']?.terminal !== undefined
      ? Boolean(config.components['support-120-wing-izq'].terminal)
      : true;

    const layoutDer = getLink120WingLayout(depthMm, 'derecha', 26, L, L_wing);
    const layoutIzq = getLink120WingLayout(depthMm, 'izquierda', 26, L, L_wing);

    // Costado ala derecha (soporte de viga hacia adentro bajo la mesa)
    const offsetDerX = isTerminalWingDer ? 16 : 0;
    const offsetDerZ = isTerminalWingDer ? 27.7 : 0;
    const wingDerX = baseX + layoutDer.wingMidpoint[0] - offsetDerX;
    const wingDerZ = layoutDer.wingMidpoint[1] - offsetDerZ;
    const wingDerCostado120 = createCostado({
      config: { ...config, type: 'sencillo' },
      key: 'support-120-wing-der',
      terminal: isTerminalWingDer,
      depthMm,
      position: [wingDerX, 355, wingDerZ],
      rotationY: Math.PI / 6,
      lengthScale,
      hasTapa: false,
    });
    if (wingDerCostado120) parts.push(wingDerCostado120);

    // Costado ala izquierda (soporte de viga hacia adentro bajo la mesa)
    const offsetIzqX = isTerminalWingIzq ? 16 : 0;
    const offsetIzqZ = isTerminalWingIzq ? 27.7 : 0;
    const wingIzqX = baseX + layoutIzq.wingMidpoint[0] - offsetIzqX;
    const wingIzqZ = layoutIzq.wingMidpoint[1] + offsetIzqZ;
    const wingIzqCostado120 = createCostado({
      config: { ...config, type: 'sencillo' },
      key: 'support-120-wing-izq',
      terminal: isTerminalWingIzq,
      depthMm,
      position: [wingIzqX, 355, wingIzqZ],
      rotationY: 5 * Math.PI / 6,
      lengthScale,
      hasTapa: false,
    });
    if (wingIzqCostado120) parts.push(wingIzqCostado120);

    // Grommets en la espina recta: uno al lado del otro (uno por puesto, separación idéntica a mesa doble Link: 166 mm centro a centro)
    if (hasGrommetIzq && (sideGrommetIzq === 'izquierda' || sideGrommetIzq === 'ambos')) {
      parts.push(linkPart('GROMMET', 'grommet-120-spine-izq', [510, 30, 100],
        [baseX + 600, surfaceHeight + thickMm / 2, -83], grommetCode, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
        {
          rotationY: Math.PI,
          model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
          componentConfig: surfaceComponentIzq,
          configTargetKey: surfaceKeyIzq,
          parentComponentKey: surfaceKeyIzq,
          is120: true,
          meta: { category: 'accesorios' },
        }));
    }
    if (hasGrommetDer && (sideGrommetDer === 'izquierda' || sideGrommetDer === 'ambos')) {
      parts.push(linkPart('GROMMET', 'grommet-120-spine-der', [510, 30, 100],
        [baseX + 600, surfaceHeight + thickMm / 2, 83], grommetCode, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
        {
          rotationY: 0,
          model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
          componentConfig: surfaceComponentDer,
          configTargetKey: surfaceKeyDer,
          parentComponentKey: surfaceKeyDer,
          is120: true,
          meta: { category: 'accesorios' },
        }));
    }
    const sin60 = Math.sqrt(3) / 2;
    const grommetDist = 83;
    if (hasGrommetDer && (sideGrommetDer === 'derecha' || sideGrommetDer === 'ambos')) {
      const cPhysX = L + 300 - grommetDist * sin60;
      const cPhysZ = 13 + (600 * sin60 + grommetDist * 0.5);
      parts.push(linkPart('GROMMET', 'grommet-120-wing-der', [510, 30, 100],
        [baseX + cPhysX, surfaceHeight + thickMm / 2, cPhysZ], grommetCode, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
        {
          rotationY: -Math.PI / 3,
          model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
          componentConfig: surfaceComponentDer,
          configTargetKey: surfaceKeyDer,
          parentComponentKey: surfaceKeyDer,
          is120: true,
          meta: { category: 'accesorios' },
        }));
    }
    if (hasGrommetIzq && (sideGrommetIzq === 'derecha' || sideGrommetIzq === 'ambos')) {
      const cPhysX = L + 300 - grommetDist * sin60;
      const cPhysZ = -13 - (600 * sin60 + grommetDist * 0.5);
      parts.push(linkPart('GROMMET', 'grommet-120-wing-izq', [510, 30, 100],
        [baseX + cPhysX, surfaceHeight + thickMm / 2, cPhysZ], grommetCode, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
        {
          rotationY: Math.PI / 3,
          model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
          componentConfig: surfaceComponentIzq,
          configTargetKey: surfaceKeyIzq,
          parentComponentKey: surfaceKeyIzq,
          is120: true,
          meta: { category: 'accesorios' },
        }));
    }

    // Ducto cableado en la espina central del puesto doble:
    // Conecta desde el costado base (baseX + 32) hasta la boca del costado intermedio ELSO740000 en baseX + L
    if (hasDuct) {
      const ductLenDoble120 = 1240;
      const duct = createDucto({
        config: { ...config, type: 'doble', widthMm: ductLenDoble120 },
        moduleIndex: 0,
        x: baseX + 32 + ductLenDoble120 / 2,
        z: 0,
        key: 'duct-0',
      });
      if (duct) {
        parts.push(duct, ...createDuctAccessories({ ...config, type: 'doble', widthMm: ductLenDoble120 }, duct));
      }
    }

    // La mesa de 120° no lleva vigas longitudinales según la especificación del sistema

    return {
      parts: parts.filter(Boolean),
      bomExtras,
      layout: { surfaceDepthMm: depthMm, gapMm: 26, totalDepthMm: depthMm * 2 + 26, centersZMm: [-313, 313] },
      leader: false,
      bounds: { widthMm: 1950, depthMm: depthMm * 2 + 26 },
    };
  }

  // Puesto individual a 120° (1 mesa curva individual, según plano CAD oficial)
  const side = config.side120 || 'derecha';
  const isDer = side === 'derecha';
  const signZ = isDer ? 1 : -1;
  const code = resolveLink120SurfaceCode(depthMm, side);
  const surfaceKey = 'surface-120-single';

  const surfaceComponent = linkComponentConfig(config, surfaceKey, {
    finishId: config.finishId,
    grommet: config.cableAccess === 'grommet',
    grommetFinish: config.grommetFinish || 'ALUMINIUM',
    grommetSide120: config.grommetSide120 || config.grommetSide || 'izquierda',
  });

  const hasSurfaceGrommet = Boolean(surfaceComponent.grommet);
  const surfaceGrommetSide = surfaceComponent.grommetSide120 || config.grommetSide120 || config.grommetSide || 'izquierda';
  const surfaceGrommetFinish = surfaceComponent.grommetFinish || config.grommetFinish || 'ALUMINIUM';
  const individualGrommetCode = LINK_GROMMET_RULES.standard[surfaceGrommetFinish] || LINK_GROMMET_RULES.standard.ALUMINIUM;

  parts.push(linkPart('SURFACE', surfaceKey, [L, thickMm, depthMm],
    [baseX, surfaceHeight + thickMm / 2, 0], code, `Superficie 120° ${side}`,
    {
      rotationY: 0,
      is120: true,
      side,
      depthMm,
      hasGrommet: hasSurfaceGrommet,
      grommetSide: surfaceGrommetSide,
      componentConfig: surfaceComponent,
      configTargetKey: surfaceKey,
      parentComponentKey: surfaceKey,
      L,
      L_wing,
      cornerR: 130,
      gap: 0,
      meta: { category: 'superficies' },
    }));

  const layout = getLink120WingLayout(depthMm, side, 0, L, L_wing);

  // Costado base sencillo de 60 cm (o 75 cm), alineado a 36 mm bajo la superficie (0 mm si intermedio)
  const isTerminalIndivBase = config.components?.['support-120-base']?.terminal !== undefined
    ? Boolean(config.components['support-120-base'].terminal)
    : true;
  const indivBaseCostado = createCostado({
    config: { ...config, type: 'sencillo' },
    key: 'support-120-base',
    terminal: isTerminalIndivBase,
    depthMm,
    position: [isTerminalIndivBase ? (baseX + 36) : baseX, 355, signZ * (depthMm / 2)],
    rotationY: -Math.PI / 2, // Orientado con los soportes de viga hacia adentro (+X)
    lengthScale,
    hasTapa: false,
  });
  if (indivBaseCostado) parts.push(indivBaseCostado);

  // Costado sencillo en el extremo exterior del ala alineado a 36 mm (soporte de viga hacia adentro)
  const isTerminalIndivWing = config.components?.['support-120-wing']?.terminal !== undefined
    ? Boolean(config.components['support-120-wing'].terminal)
    : true;
  const wingLegX = baseX + layout.wingMidpoint[0] - (isTerminalIndivWing ? 18 : 0);
  const wingLegZ = layout.wingMidpoint[1] - signZ * (isTerminalIndivWing ? 31.2 : 0);
  const wingRotY = isDer ? (Math.PI / 6) : (5 * Math.PI / 6);
  const indivWingCostado = createCostado({
    config: { ...config, type: 'sencillo' },
    key: 'support-120-wing',
    terminal: isTerminalIndivWing,
    depthMm,
    position: [wingLegX, 355, wingLegZ],
    rotationY: wingRotY,
    lengthScale,
    hasTapa: false,
  });
  if (indivWingCostado) parts.push(indivWingCostado);

  // Acceso para cableado (grommet en los lados rectos a distancia estándar Link de 70 mm del borde)
  if (hasSurfaceGrommet) {
    const sin60 = Math.sqrt(3) / 2;
    const grommetDist = 70;

    // Lado izquierdo (espina recta)
    if (surfaceGrommetSide === 'izquierda' || surfaceGrommetSide === 'ambos') {
      parts.push(linkPart('GROMMET', 'grommet-120-spine', [510, 30, 100],
        [baseX + 600, surfaceHeight + thickMm / 2, signZ * grommetDist], individualGrommetCode, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
        {
          rotationY: isDer ? 0 : Math.PI,
          model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
          componentConfig: surfaceComponent,
          configTargetKey: surfaceKey,
          parentComponentKey: surfaceKey,
          is120: true,
          meta: { category: 'accesorios' },
        }));
    }

    // Lado derecho (ala recta a 60°)
    if (surfaceGrommetSide === 'derecha' || surfaceGrommetSide === 'ambos') {
      const cPhysX = L + 300 - grommetDist * sin60;
      const cPhysZ = signZ * (600 * sin60 + grommetDist * 0.5);
      parts.push(linkPart('GROMMET', 'grommet-120-wing', [510, 30, 100],
        [baseX + cPhysX, surfaceHeight + thickMm / 2, cPhysZ], individualGrommetCode, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
        {
          rotationY: isDer ? -Math.PI / 3 : Math.PI / 3,
          model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
          componentConfig: surfaceComponent,
          configTargetKey: surfaceKey,
          parentComponentKey: surfaceKey,
          is120: true,
          meta: { category: 'accesorios' },
        }));
    }
  }

  return {
    parts: parts.filter(Boolean),
    bomExtras,
    layout: { surfaceDepthMm: depthMm, gapMm: 0, totalDepthMm: depthMm, centersZMm: [signZ * (depthMm / 2)] },
    leader: false,
    bounds: { widthMm: 1950, depthMm: depthMm + 825 },
  };
}

export function createLink120IntegrationParts(config, layout) {
  const parts = [];
  const bomExtras = [];
  const depthMm = config.depthMm >= 700 ? 750 : 600;
  const isDoble = config.type === 'doble';
  const hasGrommet = config.cableAccess === 'grommet';
  const grommetSide = config.grommetSide120 || config.grommetSide || 'izquierda';
  const hasDuct = config.hasDuct !== false;
  const surfaceHeight = 710;
  const thickMm = 30;
  const lengthScale = depthMm / 600;

  const L = 1297;
  const L_wing = 1296;

  const costadoTerminalCode = LINK_120_SUPPORTS.costadoSencillo[depthMm]?.code;
  const sup240 = LINK_120_SUPPORTS.soporte240;
  const ductCode = LINK_120_SUPPORTS.ductoDoble[1200]?.code;
  const grommetCode = LINK_GROMMET_RULES.standard[config.grommetFinish || 'ALUMINIUM'];

  const wingOption = isDoble ? (config.integracion120Wing || 'ambas') : (config.side120 || 'derecha');
  const intSide = config.integracionSide || 'derecha';
  const ends = (intSide === 'ambas' || intSide === 'ambos') ? ['derecha', 'izquierda'] : [intSide];

  let extraWidth = 0;

  ends.forEach(end => {
    const isRightEnd = end === 'derecha';
    const baseX = isRightEnd ? (config.widthMm * config.puestos / 2) : (-config.widthMm * config.puestos / 2);
    const endSign = isRightEnd ? 1 : -1;
    const baseRotY = isRightEnd ? 0 : Math.PI;

    if (isDoble) {
      const wingsToCreate = wingOption === 'ambas' ? ['izquierda', 'derecha'] : [wingOption];

      wingsToCreate.forEach(wingSide => {
        const code = resolveLink120SurfaceCode(depthMm, wingSide);
        const surfaceKey = `integracion-120-${wingSide}-${end}`;

        parts.push(linkPart('SURFACE', surfaceKey, [L, thickMm, depthMm],
          [baseX, surfaceHeight + thickMm / 2, 0], code, `Superficie 120° ${wingSide} (integración)`,
          {
            rotationY: baseRotY,
            is120: true,
            isIntegration: true,
            integracionType: '120',
            side: wingSide,
            depthMm,
            hasGrommet,
            grommetSide,
            L,
            L_wing,
            gap: 26,
            cornerR: 130,
            meta: { category: 'superficies', integracionType: '120', side: wingSide },
          }));

        // Costado terminal al final del ala (sin tapa de ducto)
        const layoutWing = getLink120WingLayout(depthMm, wingSide, 26, L, L_wing);
        const legX = baseX + endSign * (layoutWing.wingMidpoint[0] - 32.5);
        const legZ = endSign * (layoutWing.wingMidpoint[1] - (wingSide === 'derecha' ? 1 : -1) * 56.29);
        const legAngle = baseRotY + layoutWing.wingAngle;

        parts.push(linkPart('SUPPORT', `support-120-${wingSide}-${end}`, [depthMm, 710, 50.8],
          [legX, 355, legZ], costadoTerminalCode, `Costado terminal sencillo ${depthMm / 10} cm`,
          {
            rotationY: legAngle,
            hasTapa: false,
            componentConfig: { hasTapa: false },
            model: { kind: 'glb', src: '/assets/models/Link/SuperficiePrincipal/ELSO090000_60.glb', exactSize: true, ...(lengthScale !== 1 ? { lengthScale } : {}) },
            meta: { category: 'costados', hasTapa: false },
          }));
      });

      // Grommets en la espina recta o ala de la integración doble a 120°
      if (hasGrommet) {
        const sin60 = Math.sqrt(3) / 2;
        const grommetDist = 83;
        wingsToCreate.forEach(wingSide => {
          if (grommetSide === 'izquierda' || grommetSide === 'ambos') {
            const z_loc = (wingSide === 'izquierda' ? -83 : 83) * endSign;
            const rotY_grommet = (wingSide === 'izquierda' ? Math.PI : 0) + baseRotY;
            parts.push(linkPart('GROMMET', `grommet-120-${wingSide}-${end}-spine`, [510, 30, 100],
              [baseX + endSign * 600, surfaceHeight + thickMm / 2, z_loc], grommetCode, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
              {
                rotationY: rotY_grommet,
                model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
                meta: { category: 'accesorios' },
              }));
          }
          if (grommetSide === 'derecha' || grommetSide === 'ambos') {
            const cPhysX = L + 300 - grommetDist * sin60;
            const cPhysZ = (wingSide === 'derecha' ? (13 + 600 * sin60 + 41.5) : (-13 - 600 * sin60 - 41.5)) * endSign;
            const rotY_wing = (wingSide === 'derecha' ? -Math.PI / 3 : Math.PI / 3) + baseRotY;
            parts.push(linkPart('GROMMET', `grommet-120-${wingSide}-${end}-wing`, [510, 30, 100],
              [baseX + endSign * cPhysX, surfaceHeight + thickMm / 2, cPhysZ], grommetCode, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
              {
                rotationY: rotY_wing,
                model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
                meta: { category: 'accesorios' },
              }));
          }
        });
      }

      // Ducto cableado en la espina recta central de la integración doble a 120°:
      // De 1200 mm de ancho, centrado en baseX + endSign * 600 para que conecte a ras
      // con el ducto de la mesa doble en baseX sin ninguna separación (0 gap)
      if (hasDuct) {
        const ductKey = `duct-120-integracion-${end}`;
        const duct = createDucto({
          config: { ...config, type: 'doble', widthMm: 1200 },
          moduleIndex: isRightEnd ? (config.puestos || 1) : 99,
          x: baseX + endSign * 600,
          z: 0,
          key: ductKey,
        });
        if (duct) {
          parts.push(duct, ...createDuctAccessories({ ...config, type: 'doble', widthMm: 1200 }, duct));
        }
      }

      extraWidth += 1950;
    } else {
      // Sencillo
      const wingSide = wingOption === 'izquierda' ? 'izquierda' : 'derecha';
      const isDer = wingSide === 'derecha';
      const code = resolveLink120SurfaceCode(depthMm, wingSide);
      const surfaceKey = `integracion-120-${wingSide}-${end}`;

      parts.push(linkPart('SURFACE', surfaceKey, [L, thickMm, depthMm],
        [baseX, surfaceHeight + thickMm / 2, 0], code, `Superficie 120° ${wingSide} (integración)`,
        {
          rotationY: baseRotY,
          is120: true,
          isIntegration: true,
          integracionType: '120',
          side: wingSide,
          depthMm,
          hasGrommet,
          grommetSide,
          L,
          L_wing,
          meta: { category: 'superficies', integracionType: '120', side: wingSide },
        }));

      const layoutWing = getLink120WingLayout(depthMm, wingSide, 0, L, L_wing);
      const legX = baseX + endSign * (layoutWing.wingMidpoint[0] - 32.5);
      const legZ = endSign * (layoutWing.wingMidpoint[1] - (isDer ? 1 : -1) * 56.29);
      const legAngle = baseRotY + layoutWing.wingAngle;

      parts.push(linkPart('SUPPORT', `support-120-${wingSide}-${end}`, [depthMm, 710, 50.8],
        [legX, 355, legZ], costadoTerminalCode, `Costado terminal sencillo ${depthMm / 10} cm`,
        {
          rotationY: legAngle,
          hasTapa: false,
          componentConfig: { hasTapa: false },
          model: { kind: 'glb', src: '/assets/models/Link/SuperficiePrincipal/ELSO090000_60.glb', exactSize: true, ...(lengthScale !== 1 ? { lengthScale } : {}) },
          meta: { category: 'costados', hasTapa: false },
        }));

      parts.push(linkPart('SUPPORT', `support-120-apex-${end}`, sup240.dimensions,
        [baseX + endSign * L, 355, endSign * (isDer ? 13 : -13)], sup240.code, sup240.description,
        { rotationY: baseRotY, meta: { category: 'soportes' } }));

      // Grommets en la integración sencilla a 120°
      if (hasGrommet) {
        const sin60 = Math.sqrt(3) / 2;
        const grommetDist = 70;
        if (grommetSide === 'izquierda' || grommetSide === 'ambos') {
          const z_loc = (isDer ? 70 : -70) * endSign;
          const rotY_grommet = (isDer ? 0 : Math.PI) + baseRotY;
          parts.push(linkPart('GROMMET', `grommet-120-${wingSide}-${end}-spine`, [510, 30, 100],
            [baseX + endSign * 600, surfaceHeight + thickMm / 2, z_loc], grommetCode, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
            {
              rotationY: rotY_grommet,
              model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
              meta: { category: 'accesorios' },
            }));
        }
        if (grommetSide === 'derecha' || grommetSide === 'ambos') {
          const cPhysX = L + 300 - grommetDist * sin60;
          const cPhysZ = (isDer ? 1 : -1) * (600 * sin60 + 35) * endSign;
          const rotY_wing = (isDer ? -Math.PI / 3 : Math.PI / 3) + baseRotY;
          parts.push(linkPart('GROMMET', `grommet-120-${wingSide}-${end}-wing`, [510, 30, 100],
            [baseX + endSign * cPhysX, surfaceHeight + thickMm / 2, cPhysZ], grommetCode, 'GROMMET ALUMINIO 4 TOMAS LKAC250000',
            {
              rotationY: rotY_wing,
              model: { kind: 'glb', src: '/assets/models/koncisaPlus/LKAC250000.glb' },
              meta: { category: 'accesorios' },
            }));
        }
      }

      extraWidth += 1950;
    }
  });

  return { parts, bomExtras, extraWidth };
}
