// Source: LinkMapadelproducto.pdf, pp. 5–8, 20, 22, 34–36.
// Commercial codes are component codes, never an invented workstation SKU.
export const LINK_CATALOG = Object.freeze({
  principal: {
    600: { 1200: '22000008989', 1500: '22000008990', 1800: '22000008991' },
    750: { 1200: '22000008992', 1500: '22000008993', 1800: '22000008994' },
  },
  plena: {
    600: { 1200: '22000029845', 1500: '22000029846', 1800: '22000029847' },
    750: { 1200: '22000029848', 1500: '22000029849', 1800: '22000029850' },
  },
  supports: {
    sencillo: { 600: '22000032441', 750: '22000032442' },
    doble: { 600: '22000032435', 750: '22000032436' },
  },
  beams: { 1200: '22000032566', 1500: '22000032568', 1650: '22000032569', 1800: '22000032570' },
  leader: {
    600: { 1500: '22000135011', 1650: '22000135013', 1800: '22000135015' },
    750: { 1500: '22000135012', 1650: '22000135014', 1800: '22000135016' },
  },
  returns: {
    derecha: { 900: '22000135017', 1000: '22000135018' },
    izquierda: { 900: '22000135019', 1000: '22000135020' },
  },
});

export const LINK_TYPES = Object.freeze([
  { value: 'sencillo', label: 'Sencillo' },
  { value: 'doble', label: 'Doble enfrentado' },
  { value: 'lider', label: 'Líder en L · pedestal provisional' },
]);
export const LINK_WIDTHS = Object.freeze([1200, 1500, 1800]);
export const LINK_LEADER_WIDTHS = Object.freeze([1500, 1650, 1800]);
export const LINK_DEPTHS = Object.freeze([600, 750]);
export const LINK_ACCESSORIES = Object.freeze(['grommet', 'ductoIntermedio']);
