import { inputStyle, labelStyle } from '../shared/PropertyStyles.js';
export default function LinkDuctProperties({ config: c, onChange, disabled }) {
  const check = (label, key) => <label style={labelStyle}><input type="checkbox" disabled={disabled} checked={!!c[key]} onChange={(e) => onChange({ [key]: e.target.checked })} /> {label}</label>;
  return <fieldset disabled={disabled} style={{ border: 0, padding: 0, minWidth: 0 }}>
    <b>Tapas ducto</b>{check('Tapa lado izquierdo', 'coverLeft')}{check('Tapa lado derecho', 'coverRight')}
    {(c.coverLeft || c.coverRight) && <div style={{ fontSize: 11 }}>Código LINK de tapa por confirmar; BOM parcial.</div>}
    <b>Ducto bajante a piso</b>{check('Incluir ducto bajante a piso', 'floorDuct')}
    {c.floorDuct && <label style={labelStyle}>Posición<select style={inputStyle} value={c.floorSide} onChange={(e) => onChange({ floorSide: e.target.value })}><option value="LEFT">Izquierda</option><option value="CENTER">Centro</option><option value="RIGHT">Derecha</option></select></label>}
    <b>Ducto bajante a techo</b>{['LEFT', 'RIGHT'].map((side) => <label style={labelStyle} key={side}><input type="checkbox" checked={c.ceilingSide === side} onChange={(e) => onChange({ ceilingSide: e.target.checked ? side : 'NONE' })} /> Bajante lado {side === 'LEFT' ? 'izquierdo' : 'derecho'}</label>)}
  </fieldset>;
}
