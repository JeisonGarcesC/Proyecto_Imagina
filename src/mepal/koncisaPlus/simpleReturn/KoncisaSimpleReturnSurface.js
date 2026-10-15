import { createSuperficie } from '../parts/superficies.js';
import { createCostado } from '../parts/costados.js';
import { createGrommet } from '../parts/grommets.js';
import { createPasacable } from '../parts/pasacables.js';
import { createDucto } from '../parts/ductos.js';
import { getGrommetsConfig, getPasacablesConfig, getDuctosConfig } from '../rules/koncisaRules.js';
import { getKoncisaSurfaceComponentConfig } from '../rules/koncisaSurfaceComponentRules.js';

export const SIMPLE_RETURN_SURFACE_KEY = 'SIMPLE_RETURN_SURFACE';
const RETURN_DEPTH_MM = 600; // Profundidad catalogada de 22000132967.

export function resolveKoncisaSimpleReturnConfig(config = {}) {
  const value = config.returnSurface;
  if (!value?.enabled) return null;
  if (String(config.tipoPuesto || 'sencillo').toLowerCase() !== 'sencillo')
    throw new Error('La superficie de retorno solo pertenece a puestos SENCILLO.');
  const puestos = Number(config.puestos ?? 1);
  const targetModuleIndex = Number(value.targetModuleIndex);
  const widthMm = Number(value.widthMm);
  const side = String(value.side || '').toUpperCase();
  if (!Number.isInteger(puestos) || puestos < 1)
    throw new Error('La cantidad de puestos del retorno no es válida.');
  if (!Number.isInteger(targetModuleIndex) ||
      (targetModuleIndex !== 0 && targetModuleIndex !== puestos - 1))
    throw new Error('El retorno SENCILLO solo puede pertenecer al puesto inicial o final.');
  if (widthMm !== 900 && widthMm !== 1000)
    throw new Error('El retorno SENCILLO debe medir 900 o 1000 mm.');
  if (side !== 'LEFT' && side !== 'RIGHT')
    throw new Error('El lado del retorno SENCILLO debe ser LEFT o RIGHT.');
  if (puestos > 1 && ((targetModuleIndex === 0 && side !== 'LEFT') ||
      (targetModuleIndex === puestos - 1 && side !== 'RIGHT')))
    throw new Error('El lado del retorno debe coincidir con el extremo del puesto.');
  return { enabled: true, targetModuleIndex, widthMm, side, isSpecial: widthMm === 900 };
}

function rotateOffset(x, z, radians) {
  return { x: x * Math.cos(radians) + z * Math.sin(radians),
    z: -x * Math.sin(radians) + z * Math.cos(radians) };
}

export function resolveKoncisaSimpleReturnPlacement({ mainSurface, side, widthMm }) {
  if (!mainSurface?.position || !mainSurface?.dimMm)
    throw new Error('Falta la superficie principal del puesto del retorno.');
  const mainWidth = Number(mainSurface.dimMm.widthMm);
  const mainDepth = Number(mainSurface.dimMm.depthMm);
  if (!Number.isFinite(mainWidth) || !Number.isFinite(mainDepth) || mainDepth < RETURN_DEPTH_MM)
    throw new Error('La superficie principal no admite el retorno catalogado de 600 mm.');
  const direction = side === 'LEFT' ? -1 : 1;
  // En SENCILLO el grommet existente está en Z negativo: ese es el borde posterior.
  const corner = { x: mainSurface.position.x + direction * mainWidth / 2,
    z: mainSurface.position.z - mainDepth / 2 };
  return {
    corner,
    position: { x: corner.x - direction * RETURN_DEPTH_MM / 2,
      y: mainSurface.position.y, z: corner.z - widthMm / 2 },
    rotationY: direction * Math.PI / 2,
    costadoPosition: { x: corner.x - direction * RETURN_DEPTH_MM / 2,
      y: 0, z: corner.z - widthMm },
  };
}

function tag(part, returnConfig) {
  part.meta = { ...part.meta, targetSurfaceKey: SIMPLE_RETURN_SURFACE_KEY,
    moduleIndex: returnConfig.targetModuleIndex, returnSurface: true,
    returnSide: returnConfig.side, returnWidthMm: returnConfig.widthMm };
  return part;
}

function transformAccessory(part, local, placement, returnConfig) {
  const offset = rotateOffset(local.x, local.z, placement.rotationY);
  part.position = { x: placement.position.x + offset.x, y: local.y,
    z: placement.position.z + offset.z };
  part.rotation.y = (part.rotation.y || 0) + placement.rotationY;
  return tag(part, returnConfig);
}

export function buildKoncisaSimpleReturnSurface({ config, groupId, groupName, mainSurface }) {
  const returnConfig = resolveKoncisaSimpleReturnConfig(config);
  if (!returnConfig) return [];
  const placement = resolveKoncisaSimpleReturnPlacement({
    mainSurface, side: returnConfig.side, widthMm: returnConfig.widthMm,
  });
  const componentConfig = getKoncisaSurfaceComponentConfig(config, SIMPLE_RETURN_SURFACE_KEY, {
    finishCode: '22008689', thickMm: 30, variant: '', cableAccessType: 'NONE',
  });
  const surface = createSuperficie({ groupId, groupName, tipoPuesto: 'sencillo',
    widthMm: returnConfig.widthMm, depthMm: RETURN_DEPTH_MM, thickMm: 30,
    finishCode: '22008689', x: placement.position.x, y: placement.position.y,
    z: placement.position.z, index: returnConfig.targetModuleIndex });
  if (surface.code !== '22000132967') throw new Error('No se pudo resolver el código del retorno.');
  surface.rotation.y = placement.rotationY;
  surface.componentKey = SIMPLE_RETURN_SURFACE_KEY;
  surface.componentConfig = componentConfig;
  tag(surface, returnConfig);
  surface.meta = { ...surface.meta, componentKey: SIMPLE_RETURN_SURFACE_KEY, componentConfig };

  // Mismo resolver comercial y assembly del costado SENCILLO.
  const costado = createCostado({ groupId, groupName, tipo: 'terminal',
    tipoPuesto: 'sencillo', depthMm: RETURN_DEPTH_MM, forma: config.tipoCostado || 'RECT',
    lado: 'izq', ...placement.costadoPosition });
  if (!costado.code) throw new Error('No existe un costado catalogado compatible con el retorno.');
  costado.rotation.y += placement.rotationY;
  tag(costado, returnConfig);
  costado.meta = { ...costado.meta, replaceZone: 'RETURN',
    replaceKey: `KONCISA_RETURN_COSTADO_${returnConfig.targetModuleIndex}` };

  const plates = [0.25, 0.75].map((fraction, index) => ({
    type: 'leaderUnionSupport', subtype: 'simple-return-junction', line: 'KONCISA.PLUS',
    groupId, groupName, code: '22000109449', rawCodigoPT: '22000109449',
    logicalCode: `KONCISA_SIMPLE_RETURN_UNION_${index + 1}`, existsInCatalog: true,
    name: 'LAMINA DE UNION SUPERFICIES ACCESORIO MULTIPLE MAC390020',
    dimMm: { widthMm: 150, heightMm: 9, depthMm: 85 },
    position: { x: placement.corner.x - (returnConfig.side === 'LEFT' ? -1 : 1) *
      RETURN_DEPTH_MM * fraction, y: surface.position.y - surface.dimMm.thickMm / 2 - 9 / 2,
      z: placement.corner.z },
    rotation: { x: 0, y: placement.rotationY, z: 0 },
    model: { kind: 'native-block', src: null },
    meta: { category: 'return-union-supports', targetSurfaceKey: SIMPLE_RETURN_SURFACE_KEY,
      moduleIndex: returnConfig.targetModuleIndex, returnSurface: true,
      returnSide: returnConfig.side, returnWidthMm: returnConfig.widthMm,
      unionPlateIndex: index, excludeFromBOM: false },
  }));
  const parts = [surface, costado, ...plates];
  const access = componentConfig.cableAccessType;
  if (access === 'GROMMET') {
    const local = getGrommetsConfig({ puestos: 1, tipoPuesto: 'sencillo',
      largoRealMm: returnConfig.widthMm, anchoRealMm: RETURN_DEPTH_MM })[0];
    parts.push(transformAccessory(createGrommet({ groupId, groupName,
      finish: componentConfig.grommetFinish }), local, placement, returnConfig));
  }
  if (access === 'PASACABLE') {
    // LEFT/RIGHT son offsets calibrados para 1200 mm; CENTER cabe en ambos retornos.
    if (componentConfig.pasacablePosition !== 'CENTER')
      throw new Error('El pasacable del retorno solo admite posición CENTER.');
    const local = getPasacablesConfig({ puestos: 1, tipoPuesto: 'sencillo',
      largoRealMm: returnConfig.widthMm, anchoRealMm: RETURN_DEPTH_MM,
      position: 'CENTER' })[0];
    parts.push(transformAccessory(createPasacable({ groupId, groupName }), local,
      placement, returnConfig));
  }
  if (config.returnSurface?.ductEnabled === true) {
    const local = getDuctosConfig({ puestos: 1, tipoPuesto: 'sencillo',
      largoRealMm: returnConfig.widthMm, anchoRealMm: RETURN_DEPTH_MM,
      hasDuct: true, ductModes: ['TERMINAL'], ductSides: [returnConfig.side],
      tipoPasoCable: access === 'PASACABLE' ? 'pasacable' : 'grommet' })[0];
    const duct = createDucto({ groupId, groupName, tipoPuesto: 'sencillo',
      tipoModulo: 'terminal', nominalWidthMm: returnConfig.widthMm, moduleIndex: 0,
      side: returnConfig.side, accesoCableado: access === 'PASACABLE' ? 'PASACABLE' : 'GROMMET' });
    if (!duct.code || duct.dimMm.billingWidthMm > 1000)
      throw new Error('No existe un ducto catalogado compatible con el retorno.');
    parts.push(transformAccessory(duct, local, placement, returnConfig));
  }
  return parts;
}
