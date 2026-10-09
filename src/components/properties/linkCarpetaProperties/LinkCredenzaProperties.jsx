import { useState } from 'react';
import { LINK_CREDENZA_EXE_LENGTHS, LINK_CREDENZA_EXE_MODELS, LINK_CREDENZA_EXE_SIDES } from '../../../mepal/link/rules/linkCredenzaExeRules.js';
import { sectionStyle, labelStyle, inputStyle } from '../shared/PropertyStyles.js';

// Modelo, lado y largo de la credenza: reconstruyen la misma pieza en sitio (conserva posición y rotación).
export default function LinkCredenzaProperties({ part, onChange, disabled }) {
  const [values, setValues] = useState(() => ({
    credenzaModel: part.config.credenzaModel,
    side: part.config.side,
    credenzaLengthMm: part.config.credenzaLengthMm,
  }));
  async function change(key, value) {
    const ok = await onChange?.({ [key]: value });
    if (ok) setValues((current) => ({ ...current, [key]: value }));
  }
  return (
    <div style={sectionStyle}>
      <label style={labelStyle}>
        Modelo
        <select style={inputStyle} disabled={disabled} value={values.credenzaModel} onChange={(e) => change('credenzaModel', e.target.value)}>
          {LINK_CREDENZA_EXE_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </label>
      <label style={labelStyle}>
        Lado
        <select style={inputStyle} disabled={disabled} value={values.side} onChange={(e) => change('side', e.target.value)}>
          {LINK_CREDENZA_EXE_SIDES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>
      <label style={labelStyle}>
        Largo
        <select style={inputStyle} disabled={disabled} value={values.credenzaLengthMm} onChange={(e) => change('credenzaLengthMm', Number(e.target.value))}>
          {LINK_CREDENZA_EXE_LENGTHS.map((v) => <option key={v} value={v}>{v / 10} cm</option>)}
        </select>
      </label>
      <div style={{ fontSize: 11 }}>Referencia {values.credenzaModel}.</div>
    </div>
  );
}
