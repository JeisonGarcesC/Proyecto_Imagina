import { linkPart } from './linkParts.js';
import { getPrivacyPanelSupportConfig } from '../../koncisaPlus/parts/pantallas.js';

export function createPantallaFrontal({ key, widthMm, material, position, moduleIndex = 0 }) {
  const parts = [];
  
  const heightMm = 300;
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
    'LINK_PANTALLA_FRONTAL', 
    `Pantalla frontal ${material} ${screenWidth}x${heightMm}`,
    { materialBase: material.toUpperCase(), moduleIndex, meta: { category: 'pantallas' } }
  ));

  // 2. The bottom leg that enters the gap
  // Positioned below the surface. Top of the leg is at 740.
  // Center Y = 740 - legHeight/2 = 665.
  parts.push(linkPart('PANTALLA_FRONTAL_BOARD', `${key}-leg`, 
    [legWidth, legHeight, thickMm], 
    [position[0], 740 - legHeight / 2, position[2]], 
    'LINK_PANTALLA_FRONTAL_LEG', 
    `Soporte pantalla ${material}`,
    { materialBase: material.toUpperCase(), moduleIndex, meta: { category: 'pantallas' } }
  ));

  return parts;
}

export function createPantallaLateral({ key, depthMm, material = 'formica', position, rotationY = 0, moduleIndex = 0 }) {
  const parts = [];
  
  const heightMm = 300;
  const thickMm = material === 'vidrio' ? 8 : (material === 'melamina' ? 18 : (material === 'tela' ? 24 : 16));
  
  // The lateral screen must occupy the full depth of the surface as requested.
  const screenDepth = depthMm;
  
  // The board itself, rotated 90 degrees so its width spans Z axis.
  parts.push(linkPart('PANTALLA_LATERAL_BOARD', `${key}-board`, 
    [screenDepth, heightMm, thickMm], 
    [position[0], 740 + heightMm / 2, position[2]], 
    'LINK_PANTALLA_LATERAL', 
    `Pantalla lateral ${material} ${screenDepth}x${heightMm}`,
    { materialBase: material.toUpperCase(), moduleIndex, meta: { category: 'pantallas' }, rotationY: Math.PI / 2 }
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
      supportConfig.code,
      supportConfig.name,
      { model: supportConfig.model, meta: { category: 'accesorios' }, rotationY } // Apply the passed rotationY
    ));
  }

  return parts;
}
