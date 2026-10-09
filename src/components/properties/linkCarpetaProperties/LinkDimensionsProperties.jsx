import { useState } from 'react';
import { LINK_WIDTHS, LINK_DEPTHS } from '../../../mepal/link/catalog/linkCatalog.js';
import { labelStyle, inputStyle } from '../shared/PropertyStyles.js';

const SPECIAL_WIDTHS = Array.from({ length: 17 }, (_, i) => 1051 + i * 50);

// Medidas del puesto Link (individual/doble): puesto especial, largo real y ancho.
// Reconstruyen el mismo producto en sitio (conserva posición y rotación).
export default function LinkDimensionsProperties({ part, onChange, disabled }) {
  const [values, setValues] = useState(() => ({
    modoEspecial: part.config.modoEspecial === true,
    widthMm: part.config.widthMm,
    depthMm: part.config.depthMm,
  }));
  async function change(patch) {
    const ok = await onChange?.(patch);
    if (ok) setValues((current) => ({ ...current, ...patch }));
  }
  function toggleSpecial(special) {
    change(special
      ? { modoEspecial: true, widthMm: SPECIAL_WIDTHS[0] }
      : { modoEspecial: false, widthMm: LINK_WIDTHS.find((w) => w >= values.widthMm) || LINK_WIDTHS[0], depthMm: values.depthMm <= 600 ? 600 : 750 });
  }
  const widthOptions = values.modoEspecial
    ? (SPECIAL_WIDTHS.includes(values.widthMm) ? SPECIAL_WIDTHS : [values.widthMm, ...SPECIAL_WIDTHS].sort((a, b) => a - b)).map((v) => ({ value: v, label: `${v} mm` }))
    : LINK_WIDTHS.map((v) => ({ value: v, label: `${v / 10} cm` }));
  return (
    <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <label style={labelStyle}>
        <input type="checkbox" checked={values.modoEspecial} onChange={(e) => toggleSpecial(e.target.checked)} /> Puesto especial
      </label>
      <label style={labelStyle}>
        Largo real
        <select style={inputStyle} value={values.widthMm} onChange={(e) => change({ widthMm: Number(e.target.value) })}>
          {widthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label style={labelStyle}>
        Ancho
        <select style={inputStyle} value={values.depthMm} onChange={(e) => change({ depthMm: Number(e.target.value) })}>
          {LINK_DEPTHS.map((v) => <option key={v} value={v}>{v / 10} cm</option>)}
        </select>
        </label>
    </fieldset>
  );
}
