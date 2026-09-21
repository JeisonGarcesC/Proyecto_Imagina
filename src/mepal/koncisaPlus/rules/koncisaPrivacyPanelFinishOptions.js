export const KONCISA_PRIVACY_PANEL_FINISH_OPTIONS = [
  {
    id: 'PANEL_LATERAL_VIDRIO', label: 'Pantalla lateral Vidrio laminado 4+4',
    tipo: 'lateral', material: 'vidrio', finishCode: '22006318', heightMm: 300,
    hasCanto: false, hasBacker: false,
  },
  {
    id: 'PANEL_LATERAL_MELAMINA', label: 'Pantalla lateral Melamina',
    tipo: 'lateral', material: 'melamina', finishCode: '22008556', heightMm: 300,
    hasCanto: true, hasBacker: false,
  },
  {
    id: 'PANEL_LATERAL_FORMICA_22008689', label: 'Pantalla lateral Formica',
    tipo: 'lateral', material: 'formica', finishCode: '22008689', heightMm: 300,
    hasCanto: true, hasBacker: false,
  },
  {
    id: 'PANEL_LATERAL_TELA', label: 'Pantalla lateral Tela',
    tipo: 'lateral', material: 'tela', finishCode: '22010282', heightMm: 300,
    hasCanto: false, hasBacker: false,
  },

  // =========================
  // FRONTAL / FALDA - FORMICA Y TELAS
  // =========================
  {
    id: 'PANEL_FRONTAL_FORMICA_22008689',
    label: 'Falda / pantalla frontal Formica',
    tipo: 'frontal', material: 'formica', finishCode: '22008689', heightMm: 300,
    hasCanto: true, hasBacker: false,
  },
  {
    id: 'PANEL_FRONTAL_TELA_BACKER',
    label: 'Falda / pantalla frontal Tela con Backer',
    tipo: 'frontal', material: 'tela-backer', finishCode: '22010282', heightMm: 300,
    hasCanto: false, hasBacker: true,
  },
  {
    id: 'PANEL_FRONTAL_TELA',
    label: 'Falda / pantalla frontal Tela sin Backer',
    tipo: 'frontal', material: 'tela', finishCode: '22010282', heightMm: 300,
    hasCanto: false, hasBacker: false,
  },

  // =========================
  // FRONTAL / FALDA - MELAMINA
  // =========================
  {
    id: 'PANEL_FRONTAL_MELAMINA_22008556',
    label: 'Falda / pantalla frontal Melamina',
    tipo: 'frontal',
    material: 'melamina',
    finishCode: '22008556',
    heightMm: 300,
    hasCanto: true,
    hasBacker: false,
  },

  // =========================
  // FRONTAL / FALDA - VIDRIO
  // =========================
  {
    id: 'PANEL_FRONTAL_VIDRIO_22006318',
    label: 'Falda / pantalla frontal Vidrio',
    tipo: 'frontal',
    material: 'vidrio',
    finishCode: '22006318',
    heightMm: 300,
    hasCanto: false,
    hasBacker: false,
  },
];

export function getKoncisaPrivacyPanelFinishById(id) {
  return (
    KONCISA_PRIVACY_PANEL_FINISH_OPTIONS.find((option) => option.id === id) ||
    KONCISA_PRIVACY_PANEL_FINISH_OPTIONS[0]
  );
}
