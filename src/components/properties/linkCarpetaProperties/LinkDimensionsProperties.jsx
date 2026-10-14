import { useState } from 'react';
import { LINK_WIDTHS, LINK_DEPTHS, LINK_LEADER_WIDTHS, LINK_LEADER_RETURN_LENGTHS, LINK_LEADER_RETURN_DEPTHS } from '../../../mepal/link/catalog/linkCatalog.js';
import { labelStyle, inputStyle } from '../shared/PropertyStyles.js';

const SPECIAL_WIDTHS = Array.from({ length: 17 }, (_, i) => 1051 + i * 50);
// Puesto líder: mismas medidas que Koncisa Plus (principal 150/165/180 × 60/75 y retorno 90/100 × 60).
const LEADER_SPECIAL = { width: [1500, 1550, 1600, 1650, 1700, 1750, 1800], returnLength: [900, 950, 1000], returnDepth: [600, 650, 700, 750] };
const nominalWidth = (value) => LINK_WIDTHS.find((w) => w >= value) || LINK_WIDTHS[0];
const nominalLeaderWidth = (value) => LINK_LEADER_WIDTHS.find((w) => w >= value) || LINK_LEADER_WIDTHS.at(-1);
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
      ? { modoEspecial: false, widthMm: nominalLeaderWidth(values.widthMm), depthMm: nominalDepth(values.depthMm),
        returnLengthMm: values.returnLengthMm <= 900 ? 900 : 1000, returnDepthMm: 600 }
      : { modoEspecial: false, widthMm: nominalWidth(values.widthMm), depthMm: nominalDepth(values.depthMm) });
  }
  const current = values[widthKey];
  const specialOptions = leader ? (returnSurface ? LEADER_SPECIAL.returnLength : LEADER_SPECIAL.width) : SPECIAL_WIDTHS;
  const nominalOptions = leader ? (returnSurface ? LINK_LEADER_RETURN_LENGTHS : LINK_LEADER_WIDTHS) : LINK_WIDTHS;
  const widthOptions = values.modoEspecial
    ? (specialOptions.includes(current) ? specialOptions : [current, ...specialOptions].sort((a, b) => a - b)).map((v) => ({ value: v, label: `${v} mm` }))
    : nominalOptions.map((v) => ({ value: v, label: `${v / 10} cm` }));
  const depthOptions = leader && returnSurface
    ? (values.modoEspecial ? LEADER_SPECIAL.returnDepth : LINK_LEADER_RETURN_DEPTHS) : LINK_DEPTHS;
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
          {depthOptions.map((v) => <option key={v} value={v}>{v / 10} cm</option>)}
        </select>
        </label>
    </fieldset>
  );
}
