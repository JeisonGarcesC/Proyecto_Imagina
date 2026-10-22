import { resolveLinkSurfaceLayout } from '../rules/linkSurfaceRules.js';
import { createSuperficie, createSuperficieIntegracion, LINK_INTEGRACION_LENGTH_MM } from '../parts/superficies.js';
import { createCostado } from '../parts/costados.js';
import { createViga } from '../parts/vigas.js';
import { createGrommet } from '../parts/grommets.js';
import { createDucto,createDuctAccessories } from '../parts/ductos.js';
import { createPantallaFrontal, createPantallaLateral, createPantallaFalda, LINK_FALDA_PANTALLA_GAP_MM, LINK_FALDA_PANTALLA_TERMINAL_INSET_MM, LINK_PANTALLA_DEFAULT_HEIGHT_MM } from '../parts/pantallas.js';
import { linkComponentConfig } from '../rules/linkComponentRules.js';
import { LINK_INTEGRACION_PIE_AMIGO } from '../rules/linkCostadoRules.js';
import { createLink120IntegrationParts } from '../120/Link120Builder.js';
export function buildLinkStandard(config){
  const c=config,parts=[],layout=resolveLinkSurfaceLayout(c);
  // Integración de mesa doble: el costado terminal del lado de la integración pasa a ser costado de integración para recta/redonda/curva,
  // pero para integración a 120° es un costado INTERMEDIO estándar (ELSO080000), con ducto continuo y vigas solo del lado normal.
  const integracionDoble=c.type==='doble'&&c.integracionType&&c.integracionType!=='ninguna'&&c.integracionType!=='120';
  const integracionSide=c.integracionSide||'ambas';
  // Los costados se dibujan con GLB de 600 mm de ancho: se estiran en proporción cuando el ancho es otro (p. ej. 750 mm).
  const costadoLengthScale=layout.totalDepthMm/resolveLinkSurfaceLayout({...c,depthMm:600}).totalDepthMm;
  for(let moduleIndex=0;moduleIndex<c.puestos;moduleIndex++){
    const x=(moduleIndex-(c.puestos-1)/2)*c.widthMm;
    let extraWidth=0, offsetX=0;
    if (!c.modoEspecial) {
      if(c.puestos===1){ extraWidth=51; offsetX=0; }
      else if(moduleIndex===0){ extraWidth=25; offsetX=-12.5; }
      else if(moduleIndex===c.puestos-1){ extraWidth=25; offsetX=12.5; }
    }
    const realWidthMm = c.widthMm + extraWidth;
    const surfaceX = x + offsetX;

    layout.centersZMm.forEach((z,index)=>{
      const suffix=moduleIndex===0?'':'-module-'+moduleIndex;
      const surface=createSuperficie({config:c,key:'surface-'+index+suffix,widthMm:realWidthMm,depthMm:layout.surfaceDepthMm,
        position:[surfaceX,0,z],moduleIndex,rotationY:index===0&&c.type==='doble'?Math.PI:0});
      const offsetZ = c.depthMm / 2 - 15;
      const vigaZ = c.type === 'doble' ? (index === 0 ? -offsetZ : offsetZ) : 0;
      parts.push(surface,createViga({key:'beam-'+index+suffix,widthMm:c.widthMm,position:[x,690,vigaZ],moduleIndex}));
      const grommet=createGrommet(surface);if(grommet)parts.push(grommet);
    });
    if(c.hasDuct){
      const duct=createDucto({config:c,moduleIndex,x,z:c.type==='doble'?0:-layout.surfaceDepthMm/2+75});
      if(duct)parts.push(duct,...createDuctAccessories(c,duct));
    }
    if (c.type === 'doble' && c.hasPantallaFrontal) {
      const pantallaZ = c.type === 'doble' ? 0 : -layout.surfaceDepthMm / 2 + 30;
      const pantallaParts = createPantallaFrontal({
        key: `pantalla-${moduleIndex}`,
        widthMm: c.widthMm,
        material: c.pantallaFrontalMaterial,
        position: [x, 750, pantallaZ], // 750 is roughly base height for screen
        moduleIndex,
        heightMm: linkComponentConfig(c, `pantalla-${moduleIndex}-top`, { heightMm: LINK_PANTALLA_DEFAULT_HEIGHT_MM }).heightMm,
      });
      parts.push(...pantallaParts);
    }
  }
  for(let index=0;index<=c.puestos;index++){
    const is120Left = c.type === 'doble' && c.integracionType === '120' && (integracionSide === 'ambas' || integracionSide === 'izquierda') && index === 0;
    const is120Right = c.type === 'doble' && c.integracionType === '120' && (integracionSide === 'ambas' || integracionSide === 'derecha') && index === c.puestos;
    const is120End = is120Left || is120Right;
    const configTerminal = c.components?.[`support-${index}`]?.terminal;
    const terminal = configTerminal !== undefined
      ? Boolean(configTerminal)
      : ((index === 0 || index === c.puestos) && !is120End);
    const inset = terminal ? (c.puestos === 1 ? 36 : 32) : 0;
    const isDoble = c.type === 'doble';
    // Tapas hacia fuera y soportes de viga hacia dentro en terminales.
    // Costados intermedios conservan su orientación original:
    const rotY = terminal
      ? (index === 0 ? (isDoble ? Math.PI/2 : -Math.PI/2) : (isDoble ? -Math.PI/2 : Math.PI/2))
      : (isDoble ? Math.PI/2 : -Math.PI/2);
    
    // Calculate base X
    let x=-c.widthMm*c.puestos/2+index*c.widthMm+(index===0?inset:index===c.puestos?-inset:0);
    
    const depth=!terminal&&c.type==='doble'?c.depthMm*2-390:layout.totalDepthMm;
    const replaceZone = index === 0 ? 'LEFT' : index === c.puestos ? 'RIGHT' : null;
    const costadoIntegracion = integracionDoble && ((index === 0 && ['ambas','izquierda'].includes(integracionSide)) || (index === c.puestos && ['ambas','derecha'].includes(integracionSide)));

    // Determinar si este costado lleva la tapa terminal del ducto (gobernado por los ductos extremos)
    // Solo debe aparecer si hay ducto en el puesto y es un costado terminal
    let hasTapa = false;
    if (terminal && c.hasDuct !== false) {
      if (index === 0) {
        hasTapa = c.components?.['duct-0']?.coverLeft !== undefined
          ? Boolean(c.components['duct-0'].coverLeft)
          : (c.components?.['support-0']?.hasTapa !== undefined ? Boolean(c.components['support-0'].hasTapa) : true);
      } else {
        const lastDuctKey = `duct-${c.puestos - 1}`;
        const rightSupportKey = `support-${c.puestos}`;
        hasTapa = c.components?.[lastDuctKey]?.coverRight !== undefined
          ? Boolean(c.components[lastDuctKey].coverRight)
          : (c.components?.[rightSupportKey]?.hasTapa !== undefined ? Boolean(c.components?.[rightSupportKey].hasTapa) : true);
      }
    }

    const costado = createCostado({config:c,key:'support-'+index,terminal,replaceZone,depthMm:depth,position:[x,355,0],moduleIndex:index,rotationY:rotY,lengthScale:costadoLengthScale,integracion:costadoIntegracion,hasTapa});
    if (costado) parts.push(costado);

    if (c.hasPantallaLateral) {
      const side = c.pantallaLateralSide || 'ambos';
      const isLeft = index === 0;
      const isRight = index === c.puestos;
      const shouldPlace = (side === 'ambos' || side === 'ambas')
        ? (isLeft || isRight)
        : (side === 'izquierda' ? isLeft : isRight);

      if (shouldPlace) {
        const boundaryX = -c.widthMm * c.puestos / 2 + index * c.widthMm;
        layout.centersZMm.forEach((z, surfaceIndex) => {
          const lateralParts = createPantallaLateral({
            key: `pantalla-lateral-${index}-${surfaceIndex}`,
            depthMm: layout.surfaceDepthMm,
            material: c.pantallaLateralMaterial,
            position: [boundaryX, 740, z],
            rotationY: surfaceIndex === 1 ? Math.PI : 0,
            moduleIndex: index,
            heightMm: linkComponentConfig(c, `pantalla-lateral-${index}-${surfaceIndex}-board`, { heightMm: LINK_PANTALLA_DEFAULT_HEIGHT_MM }).heightMm,
          });
          parts.push(...lateralParts);
        });
      }
    }
  }
  let integracionExtraWidth = 0;
  const bomExtras = [];
  if (c.type === 'sencillo' && c.hasPantallaFalda) {
    // Falda pantalla: solo individual, una por puesto a todo lo largo del canto del lado de los grommets.
    // Entre puestos queda un espacio (como entre las pantallas); en los lados que terminan en un costado la falda no llega a la pata.
    for (let moduleIndex = 0; moduleIndex < c.puestos; moduleIndex++) {
      const leftInset = moduleIndex > 0 ? LINK_FALDA_PANTALLA_GAP_MM / 2 : LINK_FALDA_PANTALLA_TERMINAL_INSET_MM;
      const rightInset = moduleIndex < c.puestos - 1 ? LINK_FALDA_PANTALLA_GAP_MM / 2 : LINK_FALDA_PANTALLA_TERMINAL_INSET_MM;
      const moduleX = (moduleIndex - (c.puestos - 1) / 2) * c.widthMm;
      parts.push(...createPantallaFalda({
        key: `pantalla-falda-${moduleIndex}`,
        lengthMm: c.widthMm - leftInset - rightInset,
        nominalWidthMm: c.widthMm,
        material: c.pantallaFaldaMaterial,
        position: [moduleX + (leftInset - rightInset) / 2, 0, -layout.surfaceDepthMm / 2],
        moduleIndex,
      }));
    }
  }
  if (c.integracionType === '120') {
    const res120 = createLink120IntegrationParts(c, layout);
    parts.push(...res120.parts);
    bomExtras.push(...res120.bomExtras);
    integracionExtraWidth += res120.extraWidth;
  } else {
    const integracionEnabled = (c.type === 'sencillo' && c.integracionType === 'individual')
      || (c.type === 'doble' && ['recta', 'redonda', 'curva'].includes(c.integracionType));
    if (integracionEnabled) {
      const type = c.integracionType;
      const isIndividual = type === 'individual';
      const side = c.integracionSide || (isIndividual ? 'derecha' : 'ambas');
      const intLength = LINK_INTEGRACION_LENGTH_MM;

      if (side === 'ambas' || side === 'izquierda') {
        const leftX = -c.widthMm * c.puestos / 2 - intLength / 2;
        parts.push(createSuperficieIntegracion({
          config: c, key: `int-left`, widthMm: intLength, depthMm: layout.totalDepthMm,
          position: [leftX, 0, 0], rotationY: isIndividual ? 0 : Math.PI, type, holeSide: isIndividual ? 'derecha' : null, side: 'izquierda'
        }));
        integracionExtraWidth += intLength;
      }

      if (side === 'ambas' || side === 'derecha') {
        const rightX = c.widthMm * c.puestos / 2 + intLength / 2;
        parts.push(createSuperficieIntegracion({
          config: c, key: `int-right`, widthMm: intLength, depthMm: layout.totalDepthMm,
          position: [rightX, 0, 0], rotationY: 0, type, holeSide: isIndividual ? 'izquierda' : null, side: 'derecha'
        }));
        integracionExtraWidth += intLength;
      }
    }
  }
  if (integracionDoble) {
    const surfaces = parts.filter(p => p.meta?.integracionType === c.integracionType).length;
    if (surfaces) bomExtras.push({ code: LINK_INTEGRACION_PIE_AMIGO.code, description: LINK_INTEGRACION_PIE_AMIGO.description, quantity: surfaces * LINK_INTEGRACION_PIE_AMIGO.perSurface });
  }
  return {parts: parts.filter(Boolean),layout,leader:false,bounds:{widthMm:c.widthMm*c.puestos + integracionExtraWidth,depthMm:layout.totalDepthMm},bomExtras};
}

