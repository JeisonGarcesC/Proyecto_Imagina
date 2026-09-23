import { LINK_SUPPORT_SHAPES } from '../../../mepal/link/rules/linkSurfaceFinishOptions.js';
import { inputStyle, labelStyle } from '../shared/PropertyStyles.js';
export default function LinkCostadoProperties({ part, config: c, onChange, disabled }) {
  const pedestal = part.componentRole === 'PEDESTAL';
  return <fieldset disabled={disabled} style={{ border: 0, padding: 0, minWidth: 0 }}>
    {!pedestal && <><label style={labelStyle}>Forma del costado<select style={inputStyle} value={c.shape} onChange={(e) => onChange({ shape: e.target.value })}>{LINK_SUPPORT_SHAPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label><label style={labelStyle}>Acabado del costado<select style={inputStyle} value={c.supportFinish} onChange={(e) => onChange({ supportFinish: e.target.value })}><option value="PINTADO">Pintado</option><option value="CROMADO">Cromado</option></select></label></>}
    {part.leaderRole === 'MAIN_RETURN_JUNCTION' && <label style={labelStyle}><input type="checkbox" checked={!!c.hasOutletBox} onChange={(e) => onChange({ hasOutletBox: e.target.checked })} /> Incluir caja de tomas</label>}
  </fieldset>;
}
