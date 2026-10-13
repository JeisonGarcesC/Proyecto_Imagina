import { useState } from 'react';
import { LINK_WIDTHS, LINK_DEPTHS } from '../../../mepal/link/catalog/linkCatalog.js';
import { labelStyle, inputStyle } from '../shared/PropertyStyles.js';

const SPECIAL_WIDTHS = Array.from({ length: 17 }, (_, i) => 1051 + i * 50);
const nominalWidth = (value) => LINK_WIDTHS.find((w) => w >= value) || LINK_WIDTHS[0];
const nominalDepth = (value) => (value <= 600 ? 600 : 750);

// Medidas del puesto Link (individual/doble): puesto especial, largo real y ancho.
// En el puesto líder las mismas medidas existen para la superficie principal y para la de retorno (returnSurface).
// Reconstruyen el mismo producto en sitio (conserva posición y rotación).
export default function LinkDimensionsProperties({ part, onChange, disabled, returnSurface = false }) {
  const leader = part.config.type === 'lider';
  const widthKey = returnSurface ? 'returnLengthMm' : 'widthMm';
  const depthKey = returnSurface ? 'returnDepthMm' : 'depthMm';
  const [values, setValues] = useState(() => ({
    modoEspecial: part.config.modoEspecial === true,
    widthMm: part.config.widthMm,
    depthMm: part.config.depthMm,
    returnLengthMm: part.config.returnLengthMm,
    returnDepthMm: part.config.returnDepthMm,
  }));
  async function change(patch) {
    const ok = await onChange?.(patch);
    if (ok) setValues((current) => ({ ...current, ...patch }));
  }
  function toggleSpecial(special) {
    if (special) return change(leader ? { modoEspecial: true } : { modoEspecial: true, widthMm: SPECIAL_WIDTHS[0] });
    return change(leader
      ? { modoEspecial: false, widthMm: nominalWidth(values.widthMm), depthMm: nominalDepth(values.depthMm),
        returnLengthMm: nominalWidth(values.returnLengthMm), returnDepthMm: nominalDepth(values.returnDepthMm) }
      : { modoEspecial: false, widthMm: nominalWidth(values.widthMm), depthMm: nominalDepth(values.depthMm) });
  }
  const current = values[widthKey];
  const widthOptions = values.modoEspecial
    ? (SPECIAL_WIDTHS.includes(current) ? SPECIAL_WIDTHS : [current, ...SPECIAL_WIDTHS].sort((a, b) => a - b)).map((v) => ({ value: v, label: `${v} mm` }))
    : LINK_WIDTHS.map((v) => ({ value: v, label: `${v / 10} cm` }));
  return (
    <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      {leader && <div style={{ fontSize: 12, fontWeight: 600 }}>{returnSurface ? 'Superficie de retorno' : 'Superficie principal'}</div>}
      <label style={labelStyle}>
        <input type="checkbox" checked={values.modoEspecial} onChange={(e) => toggleSpecial(e.target.checked)} /> Puesto especial
      </label>
      <label style={labelStyle}>
        Largo real
        <select style={inputStyle} value={current} onChange={(e) => change({ [widthKey]: Number(e.target.value) })}>
          {widthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label style={labelStyle}>
        Ancho
        <select style={inputStyle} value={values[depthKey]} onChange={(e) => change({ [depthKey]: Number(e.target.value) })}>
          {LINK_DEPTHS.map((v) => <option key={v} value={v}>{v / 10} cm</option>)}
        </select>
        </label>
    </fieldset>
  );
}
