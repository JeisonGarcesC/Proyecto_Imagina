// Códigos comerciales de pantallas LINK (frontal, lateral y falda) según la lista de precios.
// null / ausente = el catálogo no tiene ese código: la pieza no entra al BOM y queda como BOM parcial.
// "vidrio" se factura como vidrio laminado (el templado también existe: frontal LKAC280000, lateral LKAC050000).

// Pantalla frontal (solo mesa doble): por acabado, alto (300 = 30 cm, 500 = 50 cm) y largo nominal del puesto (mm).
// Formica y vidrio llevan 38/58 en la descripción comercial (30/50 cm de pantalla + pata).
export const LINK_PANTALLA_FRONTAL_CODES = {
  formica: { 300: { 1200: '22000021967', 1500: '22000021968', 1800: '22000021969' } },
  vidrio: {
    300: { 1200: '22000103716', 1500: '22000103717', 1800: '22000103718', 2100: '22000120363' },
    500: { 1200: '22000103719', 1500: '22000103720', 1800: '22000103721', 2100: '22000120364' },
  },
  tela: {
    300: { 1200: '22000130155', 1500: '22000130156', 1800: '22000130157' },
    500: { 1200: '22000130158', 1500: '22000130159', 1800: '22000130160' },
  },
};

// Pantalla lateral por acabado y fondo nominal (mm). Solo existe de 30 cm de alto.
export const LINK_PANTALLA_LATERAL_CODES = {
  formica: { 600: '22000009065', 750: '22000009066' },
  vidrio: { 600: '22000030562', 750: '22000030563' },
};
// Juego de soporte de pantalla lateral (LKAC051000): uno por pantalla lateral.
export const LINK_PANTALLA_LATERAL_SUPPORT_CODE = '22000015337';

// Falda pantalla (solo puesto individual) por acabado y largo nominal del puesto (mm).
export const LINK_PANTALLA_FALDA_CODES = {
  formica: { 1200: '22000105883', 1500: '22000105884', 1800: '22000105885' },
  vidrio: { 1200: '22000103713', 1500: '22000103714', 1800: '22000103715', 2100: '22000120362' },
};

// Largo nominal: el menor disponible que cubra la medida; por encima del mayor se usa el mayor del catálogo.
function nominalWidth(table, widthMm) {
  const widths = Object.keys(table).map(Number).sort((a, b) => a - b);
  return widths.find(w => w >= widthMm) ?? widths[widths.length - 1];
}

export function resolveLinkPantallaFrontalCode(material, widthMm, heightMm) {
  const byHeight = LINK_PANTALLA_FRONTAL_CODES[material]?.[heightMm >= 500 ? 500 : 300];
  return byHeight ? byHeight[nominalWidth(byHeight, widthMm)] || null : null;
}

export function resolveLinkPantallaLateralCode(material, depthMm) {
  // La superficie plena suma 13 mm al fondo: 613 mm sigue siendo fondo nominal 600.
  return LINK_PANTALLA_LATERAL_CODES[material]?.[depthMm < 675 ? 600 : 750] || null;
}

export function resolveLinkPantallaFaldaCode(material, widthMm) {
  const table = LINK_PANTALLA_FALDA_CODES[material];
  return table ? table[nominalWidth(table, widthMm)] || null : null;
}
