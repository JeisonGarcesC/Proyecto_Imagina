import { createSuperficie } from '../parts/superficies.js';
import { createCostado } from '../parts/costados.js';
import { createGrommet } from '../parts/grommets.js';
import { createPasacable } from '../parts/pasacables.js';
import { createDucto } from '../parts/ductos.js';
import { resolvePedestalFromCostado } from '../rules/koncisaPedestalRules.js';
import { getGrommetsConfig, getPasacablesConfig, getDuctosConfig } from '../rules/koncisaRules.js';
import { getKoncisaSurfaceComponentConfig } from '../rules/koncisaSurfaceComponentRules.js';

export const SIMPLE_RETURN_SURFACE_KEY = 'SIMPLE_RETURN_SURFACE';
export const SIMPLE_RETURN_ORIENTATION_FRONT = 'FRONT';
export const SIMPLE_RETURN_ORIENTATION_BACK = 'BACK';
const RETURN_DEPTH_MM = 600; // Profundidad catalogada de 22000132967.
const PEDESTAL_BACK_INSET_MM = 368; // Avance longitudinal del pedestal SENCILLO hacia el interior.

export function resolveKoncisaSimpleReturnConfig(config = {}) {
  const value = config.returnSurface;
  if (!value?.enabled) return null;
  if (String(config.tipoPuesto || 'sencillo').toLowerCase() !== 'sencillo')
    throw new Error('La superficie de retorno solo pertenece a puestos SENCILLO.');
  const puestos = Number(config.puestos ?? 1);
  const targetModuleIndex = Number(value.targetModuleIndex);
  const widthMm = Number(value.widthMm);
  const side = String(value.side || '').toUpperCase();
  // Configuraciones anteriores no guardaban orientación y salían hacia Z negativo.
  const returnOrientation = String(value.returnOrientation || SIMPLE_RETURN_ORIENTATION_BACK).toUpperCase();
  if (!Number.isInteger(puestos) || puestos < 1)
    throw new Error('La cantidad de puestos del retorno no es válida.');
  if (!Number.isInteger(targetModuleIndex) ||
      (targetModuleIndex !== 0 && targetModuleIndex !== puestos - 1))
    throw new Error('El retorno SENCILLO solo puede pertenecer al puesto inicial o final.');
  if (widthMm !== 900 && widthMm !== 1000)
    throw new Error('El retorno SENCILLO debe medir 900 o 1000 mm.');
  if (side !== 'LEFT' && side !== 'RIGHT')
    throw new Error('El lado del retorno SENCILLO debe ser LEFT o RIGHT.');
  if (returnOrientation !== SIMPLE_RETURN_ORIENTATION_FRONT &&
      returnOrientation !== SIMPLE_RETURN_ORIENTATION_BACK)
    throw new Error('La orientación del retorno SENCILLO debe ser FRONT o BACK.');
  const ductType = String(value.ductType || 'TERMINAL').toUpperCase();
  if (!['TERMINAL', 'INTERMEDIO', 'INDIVIDUAL'].includes(ductType))
    throw new Error('El tipo de ducto del retorno no es válido.');
  const pedestalSide = String(value.pedestal?.placementSide || 'RIGHT').toUpperCase();
  if (!['LEFT', 'RIGHT'].includes(pedestalSide))
    throw new Error('La posición del pedestal del retorno no es válida.');
  return { enabled: true, targetModuleIndex, widthMm, side, returnOrientation,
    isSpecial: widthMm === 900 };
}

function rotateOffset(x, z, radians) {
  return { x: x * Math.cos(radians) + z * Math.sin(radians),
    z: -x * Math.sin(radians) + z * Math.cos(radians) };
}

function functionalDepthOffset(z, returnConfig) {
  // Las reglas SENCILLO expresan la profundidad en el marco local de FRONT.
  // BACK conserva la superficie y su unión, pero invierte el lado funcional
  // de los accesorios dentro de esa misma superficie.
  return returnConfig.returnOrientation === SIMPLE_RETURN_ORIENTATION_BACK ? -z : z;
}

export function resolveKoncisaSimpleReturnPlacement({ mainSurface, side, widthMm,
  returnOrientation = SIMPLE_RETURN_ORIENTATION_BACK }) {
  if (!mainSurface?.position || !mainSurface?.dimMm)
    throw new Error('Falta la superficie principal del puesto del retorno.');
  const mainWidth = Number(mainSurface.dimMm.widthMm);
  const mainDepth = Number(mainSurface.dimMm.depthMm);
  if (!Number.isFinite(mainWidth) || !Number.isFinite(mainDepth) || mainDepth < RETURN_DEPTH_MM)
    throw new Error('La superficie principal no admite el retorno catalogado de 600 mm.');
  const direction = side === 'LEFT' ? -1 : 1;
  // El borde anterior está en Z positivo; el posterior, ya implementado, en Z negativo.
  const orientation = returnOrientation === SIMPLE_RETURN_ORIENTATION_FRONT ? 1 : -1;
  const corner = { x: mainSurface.position.x + direction * mainWidth / 2,
    z: mainSurface.position.z + orientation * mainDepth / 2 };
  return {
    corner,
    position: { x: corner.x - direction * RETURN_DEPTH_MM / 2,
      y: mainSurface.position.y, z: corner.z + orientation * widthMm / 2 },
    rotationY: -orientation * direction * Math.PI / 2,
    costadoPosition: { x: corner.x - direction * RETURN_DEPTH_MM / 2,
      y: 0, z: corner.z + orientation * widthMm },
  };
}

function tag(part, returnConfig) {
  part.meta = { ...part.meta, targetSurfaceKey: SIMPLE_RETURN_SURFACE_KEY,
    moduleIndex: returnConfig.targetModuleIndex, returnSurface: true,
    side: returnConfig.side, returnSide: returnConfig.side,
    widthRealMm: returnConfig.widthMm, returnWidthMm: returnConfig.widthMm,
    returnOrientation: returnConfig.returnOrientation };
  return part;
}

function transformAccessory(part, local, placement, returnConfig) {
  const offset = rotateOffset(local.x, functionalDepthOffset(local.z, returnConfig),
    placement.rotationY);
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
    returnOrientation: returnConfig.returnOrientation,
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
    lado: returnConfig.side === 'RIGHT' ? 'der' : 'izq', ...placement.costadoPosition });
  if (!costado.code) throw new Error('No existe un costado catalogado compatible con el retorno.');
  // SENCILLO gira el terminal derecho PI respecto al izquierdo. Conservar esa
  // lateralidad antes de llevar el costado al eje perpendicular del retorno.
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
      side: returnConfig.side, returnSide: returnConfig.side,
      widthRealMm: returnConfig.widthMm, returnWidthMm: returnConfig.widthMm,
      returnOrientation: returnConfig.returnOrientation,
      unionPlateIndex: index, excludeFromBOM: false },
  }));
  const parts = [surface, ...plates];
  if (config.returnSurface?.pedestal?.enabled === true) {
    const placementSide = String(config.returnSurface.pedestal.placementSide || 'RIGHT').toUpperCase();
    const resolved = resolvePedestalFromCostado({
      costado: { userData: { meta: { ...costado.meta, replaceZone: returnConfig.side },
        dim: costado.dimMm } }, placementSide,
    });
    // En BACK el frente funcional queda hacia la unión con el puesto principal.
    // Después de reflejar el offset longitudinal, avanzar el pedestal hacia
    // el interior en el eje local del retorno, con signo según LEFT/RIGHT.
    const pedestalLongitudinalOffset = returnConfig.returnOrientation === SIMPLE_RETURN_ORIENTATION_BACK
      ? -(resolved.offsetMm.x || 0) +
        (returnConfig.side === 'LEFT' ? PEDESTAL_BACK_INSET_MM : -PEDESTAL_BACK_INSET_MM)
      : (resolved.offsetMm.x || 0);
    const offset = rotateOffset(pedestalLongitudinalOffset,
      functionalDepthOffset(resolved.offsetMm.z || 0, returnConfig), placement.rotationY);
    parts.push(tag({ type: 'pedestal', line: 'KONCISA.PLUS', groupId, groupName,
      code: resolved.code, logicalCode: resolved.logicalCode, name: resolved.name,
      position: { x: costado.position.x + offset.x,
        y: costado.position.y + (resolved.offsetMm.y || 0),
        z: costado.position.z + offset.z },
      rotation: { x: 0, y: costado.rotation.y + (resolved.offsetMm.rotY || 0) +
        (returnConfig.returnOrientation === SIMPLE_RETURN_ORIENTATION_BACK ? Math.PI : 0), z: 0 },
      model: { kind: 'glb', src: resolved.modelSrc },
      meta: { category: 'pedestales', tipoPuesto: 'sencillo',
        replaceCostado: true, replaceKey: costado.meta.replaceKey,
        replaceZone: returnConfig.side, placementSide,
        realDepthMm: RETURN_DEPTH_MM } }, returnConfig));
  } else {
    parts.push(costado);
  }
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
    const ductType = String(config.returnSurface.ductType || 'TERMINAL').toUpperCase();
    if (ductType === 'INDIVIDUAL' && access === 'PASACABLE')
      throw new Error('El ducto individual SENCILLO no admite pasacable.');
    const local = getDuctosConfig({ puestos: 1, tipoPuesto: 'sencillo',
      largoRealMm: returnConfig.widthMm, anchoRealMm: RETURN_DEPTH_MM,
      hasDuct: true, ductModes: [ductType], ductSides: [returnConfig.side],
      tipoPasoCable: access === 'PASACABLE' ? 'pasacable' : 'grommet' })[0];
    const duct = createDucto({ groupId, groupName, tipoPuesto: 'sencillo',
      tipoModulo: ductType.toLowerCase(), nominalWidthMm: returnConfig.widthMm, moduleIndex: 0,
      side: returnConfig.side, accesoCableado: access === 'PASACABLE' ? 'PASACABLE' : 'GROMMET' });
    if (!duct.code || duct.dimMm.billingWidthMm > 1000)
      throw new Error('No existe un ducto catalogado compatible con el retorno.');
    parts.push(transformAccessory(duct, local, placement, returnConfig));
  }
  return parts;
}
