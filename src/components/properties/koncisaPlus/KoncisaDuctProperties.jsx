import { inputStyle, labelStyle, sectionStyle } from '../shared/PropertyStyles';

export default function KoncisaDuctProperties({ part, api }) {
  return (
    <div style={sectionStyle}>
      <label style={labelStyle}>Tipo de ducto</label>

      <select
        value={String(part?.meta?.tipoModulo || 'TERMINAL').toUpperCase()}
        onChange={(e) => api?.updateSelectedDuctType?.(e.target.value)}
        style={inputStyle}
      >
        <option value="TERMINAL">Terminal</option>
        <option value="INTERMEDIO">Intermedio</option>
        <option value="INDIVIDUAL">Individual</option>
      </select>
    </div>
  );
}
