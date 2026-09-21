export const VETRO_PANEL_WIDTHS = Object.freeze([
  { nominalCm: 30, realCm: 29.7 }, { nominalCm: 60, realCm: 59.7 },
  { nominalCm: 75, realCm: 74.7 }, { nominalCm: 90, realCm: 89.7 },
  { nominalCm: 120, realCm: 119.7 },
]);
export const VETRO_PANEL_HEIGHTS_CM = Object.freeze([204, 242, 280, 318]);
export const VETRO_PANEL_MATERIALS = Object.freeze({
  TEMPERED_GLASS_10MM: { reference: 'VTPN020000', label: 'Vidrio templado 10 mm', documentedThicknessMm: 10 },
  COMPACT_FORMICA_F100: { reference: 'VTPN070000', label: 'Fórmica compacta F100', documentedThicknessMm: null },
  COMPACT_BOARD_FORMICA_F100: { reference: 'VTPN070000', label: 'Fórmica tablero compacto F100', documentedThicknessMm: null },
});

const codes = {
  TEMPERED_GLASS_10MM: {
    30: { 204: '22000009771', 242: '22000009772', 280: '22000009773', 318: '22000009774' },
    60: { 204: '22000009775', 242: '22000009776', 280: '22000009777', 318: '22000009778' },
    75: { 204: '22000009779', 242: '22000009780', 280: '22000009781', 318: '22000009782' },
    90: { 204: '22000009783', 242: '22000009784', 280: '22000009785', 318: '22000009786' },
    120: { 204: '22000009787', 242: '22000009788', 280: '22000009789', 318: '22000009790' },
  },
  COMPACT_FORMICA_F100: {
    30: { 204: '22000112829', 242: '22000112830', 280: '22000112831' },
    60: { 204: '22000112832', 242: '22000112833', 280: '22000112834' },
    75: { 204: '22000112835', 242: '22000112836', 280: '22000112837' },
    90: { 204: '22000112838', 242: '22000112839', 280: '22000112840' },
    120: { 204: '22000112841', 242: '22000112842', 280: '22000112843' },
  },
  COMPACT_BOARD_FORMICA_F100: {
    30: { 204: '22000112844', 242: '22000112845', 280: '22000112846' },
    60: { 204: '22000112847', 242: '22000112848', 280: '22000112849' },
    75: { 204: '22000112850', 242: '22000112851', 280: '22000112852' },
    90: { 204: '22000112853', 242: '22000112854', 280: '22000112855' },
    120: { 204: '22000112856', 242: '22000112857', 280: '22000112858' },
  },
};

export const VETRO_PANEL_CODE_CATALOG = Object.freeze(
  Object.entries(codes).flatMap(([material, widths]) =>
    Object.entries(widths).flatMap(([nominalWidthCm, heights]) =>
      Object.entries(heights).map(([nominalHeightCm, code]) => Object.freeze({
        category: 'PANELS', productType: 'PANEL', material,
        reference: VETRO_PANEL_MATERIALS[material].reference,
        nominalWidthCm: Number(nominalWidthCm),
        realWidthCm: VETRO_PANEL_WIDTHS.find((item) => item.nominalCm === Number(nominalWidthCm))?.realCm,
        nominalHeightCm: Number(nominalHeightCm), code,
      }))
    )
  )
);

