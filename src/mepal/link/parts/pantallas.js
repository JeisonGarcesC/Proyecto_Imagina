import { linkPart } from './linkParts.js';
import { getPrivacyPanelSupportConfig } from '../../koncisaPlus/parts/pantallas.js';
import {
  resolveLinkPantallaFrontalCode,
  resolveLinkPantallaLateralCode,
  resolveLinkPantallaFaldaCode,
  LINK_PANTALLA_LATERAL_SUPPORT_CODE,
} from '../rules/linkPantallaRules.js';

export const LINK_PANTALLA_HEIGHTS_MM = [300, 500];
export const LINK_PANTALLA_DEFAULT_HEIGHT_MM = 300;

export function createPantallaFrontal({ key, widthMm, material, position, moduleIndex = 0, heightMm = LINK_PANTALLA_DEFAULT_HEIGHT_MM }) {
  const parts = [];
  const componentConfig = { heightMm };
  const targetKey = `${key}-top`;
  const thickMm = material === 'vidrio' ? 8 : (material === 'melamina' ? 18 : (material === 'tela' ? 24 : 16));
  
  // To match the image: screen doesn't occupy full width, leaves a small gap (e.g. 40mm per side).
  // And it drops down into the central gap (the inverted T shape leg).
  const screenWidth = Math.max(200, widthMm - 80);
  const legWidth = Math.max(100, screenWidth * 0.5); // 50% of screen width goes into the gap
  const legHeight = 150; // Drops 150mm down into the gap
  
  // 1. The top board (main screen)
  // Positioned so its bottom is flush with the surface top (Y=740).
  // Thus center Y = 740 + heightMm/2 = 890.
  parts.push(linkPart('PANTALLA_FRONTAL_BOARD', `${key}-top`, 
    [screenWidth, heightMm, thickMm], 
    [position[0], 740 + heightMm / 2, position[2]], 
    resolveLinkPantallaFrontalCode(material, widthMm, heightMm),
    `Pantalla frontal ${material} ${screenWidth}x${heightMm}`,
    { materialBase: material.toUpperCase(), moduleIndex, componentConfig, configTargetKey: targetKey, meta: { category: 'pantallas' } }
  ));

  // 2. The bottom leg that enters the gap
  // Positioned below the surface. Top of the leg is at 740.
  // Center Y = 740 - legHeight/2 = 665.
  parts.push(linkPart('PANTALLA_FRONTAL_BOARD', `${key}-leg`, 
    [legWidth, legHeight, thickMm], 
    [position[0], 740 - legHeight / 2, position[2]], 
    null, // La pata va incluida en el código de la pantalla frontal: no se factura aparte.
    `Soporte pantalla ${material}`,
    { materialBase: material.toUpperCase(), moduleIndex, componentConfig, configTargetKey: targetKey, excludeFromBOM: true, meta: { category: 'pantallas' } }
  ));

  return parts;
}

export function createPantallaLateral({ key, depthMm, material = 'formica', position, rotationY = 0, moduleIndex = 0, heightMm = LINK_PANTALLA_DEFAULT_HEIGHT_MM }) {
  const parts = [];
  const componentConfig = { heightMm };
  const thickMm = material === 'vidrio' ? 8 : (material === 'melamina' ? 18 : (material === 'tela' ? 24 : 16));
  
  // The lateral screen must occupy the full depth of the surface as requested.
  const screenDepth = depthMm;
  
  // The board itself, rotated 90 degrees so its width spans Z axis.
  parts.push(linkPart('PANTALLA_LATERAL_BOARD', `${key}-board`, 
    [screenDepth, heightMm, thickMm], 
    [position[0], 740 + heightMm / 2, position[2]], 
    resolveLinkPantallaLateralCode(material, screenDepth),
    `Pantalla lateral ${material} ${screenDepth}x${heightMm}`,
    { materialBase: material.toUpperCase(), moduleIndex, componentConfig, meta: { category: 'pantallas' }, rotationY: Math.PI / 2 }
  ));

  // Add the Koncisa lateral support (since Link uses the same for lateral screens as per user's prompt).
  const supportConfig = getPrivacyPanelSupportConfig({
    tipo: 'lateral', 
    material, 
    lengthMm: screenDepth 
  });
  if (supportConfig && supportConfig.model) {
    parts.push(linkPart('STRUCTURE', `${key}-support`,
      [supportConfig.widthMm || 30, supportConfig.heightMm || 300, supportConfig.depthMm || screenDepth],
      [position[0], 740, position[2]],
      LINK_PANTALLA_LATERAL_SUPPORT_CODE, // Juego soporte pantalla lateral LINK (LKAC051000)
      'JUEGO SOPORTE PANTALLA LATERAL ACCESORIO LINK LKAC051000',
      { model: supportConfig.model, meta: { category: 'accesorios' }, rotationY } // Apply the passed rotationY
    ));
  }

  return parts;
}

// Falda pantalla (solo puesto individual): tablero vertical en el canto de la superficie del lado de los grommets, a todo lo largo
// del puesto. Sube igual que la pantalla frontal (300 mm sobre la superficie, que está a 740 mm) y baja ~80 mm más que el ducto
// cableado (cuya base queda ~543 mm). `position[2]` es el plano del canto; el tablero queda por fuera de la superficie.
export const LINK_FALDA_PANTALLA_TOP_MM = 740 + 300;
export const LINK_FALDA_PANTALLA_BOTTOM_MM = 460;
// Espacio entre faldas de puestos contiguos (igual al de las pantallas frontales: 40 mm por lado).
export const LINK_FALDA_PANTALLA_GAP_MM = 80;
// Lado que termina en un costado (individual y terminales): la falda se queda corta antes de la pata
// (pata a 65 mm del extremo de la mesa, tubo de 50.8 mm, más ~10 mm de holgura).
export const LINK_FALDA_PANTALLA_TERMINAL_INSET_MM = 100;
export function createPantallaFalda({ key, lengthMm, nominalWidthMm = null, material = 'formica', position, moduleIndex = 0 }) {
  const heightMm = LINK_FALDA_PANTALLA_TOP_MM - LINK_FALDA_PANTALLA_BOTTOM_MM;
  const thickMm = material === 'vidrio' ? 8 : (material === 'melamina' ? 18 : (material === 'tela' ? 24 : 16));
  return [linkPart('PANTALLA_FALDA_BOARD', `${key}-board`,
    [lengthMm, heightMm, thickMm],
    [position[0], LINK_FALDA_PANTALLA_BOTTOM_MM + heightMm / 2, position[2] - thickMm / 2],
    resolveLinkPantallaFaldaCode(material, nominalWidthMm ?? lengthMm),
    `Falda pantalla ${material} ${lengthMm}x${heightMm}`,
    { materialBase: material.toUpperCase(), moduleIndex, meta: { category: 'pantallas' } }
  )];
}
