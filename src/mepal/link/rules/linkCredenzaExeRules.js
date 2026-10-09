// Credenza LINK (Link Exe), referencia LKAL160000. Modelos GLB propios en /assets/models/Link/Credenza EXE.
// Medidas reales de los modelos: 1226 × 643 × 514 mm (120 cm) y 1526 × 643 × 514 mm (150 cm).
// Los códigos coinciden con ptsinbom_4.xml ("CREDENZA BAJA CABLEADO 2 GAVETAS ARCHIVOS ... LINK.EXE LKAL160000").
// Solo se declara el código: precio y descripción comercial se resuelven desde los XML como en el resto de piezas.
export const LINK_CREDENZA_EXE_MODELS = Object.freeze([
  { value: 'LKAL160000', label: '2 archivos',
    codes: { izquierda: { 1200: '22000044144', 1500: '22000044146' }, derecha: { 1200: '22000044143', 1500: '22000044145' } } },
  { value: 'LKAL180000', label: '1 archivo 2 cajoneras',
    codes: { izquierda: { 1200: '22000044152', 1500: '22000044154' }, derecha: { 1200: '22000044151', 1500: '22000044153' } } },
  { value: 'LKAL170000', label: '2 archivos 2 cajoneras',
    codes: { izquierda: { 1200: '22000044148', 1500: '22000044150' }, derecha: { 1200: '22000044147', 1500: '22000044149' } } },
]);
export const LINK_CREDENZA_EXE_DEFAULT_MODEL = 'LKAL160000';
export const LINK_CREDENZA_EXE_LENGTHS = Object.freeze([1200, 1500]);
export const LINK_CREDENZA_EXE_SIDES = Object.freeze([
  { value: 'izquierda', label: 'Izquierda', suffix: 'IZ' },
  { value: 'derecha', label: 'Derecha', suffix: 'DER' },
]);
const MODEL_FOLDER = '/assets/models/Link/Credenza%20EXE/';
const EXTRA_WIDTH_MM = 26;
const HEIGHT_MM = 643;
const DEPTH_MM = 514;

export function resolveLinkCredenzaExe({ side, credenzaLengthMm, credenzaModel = LINK_CREDENZA_EXE_DEFAULT_MODEL }) {
  const sideRule = LINK_CREDENZA_EXE_SIDES.find(s => s.value === side);
  const model = LINK_CREDENZA_EXE_MODELS.find(m => m.value === credenzaModel);
  if (!sideRule || !model || !LINK_CREDENZA_EXE_LENGTHS.includes(credenzaLengthMm)) throw new Error('Credenza LINK no disponible.');
  return {
    reference: model.value,
    label: model.label,
    code: model.codes[side][credenzaLengthMm],
    modelSrc: `${MODEL_FOLDER}${model.value}_${sideRule.suffix}_${credenzaLengthMm / 10}.glb`,
    widthMm: credenzaLengthMm + EXTRA_WIDTH_MM,
    heightMm: HEIGHT_MM,
    depthMm: DEPTH_MM,
  };
}
