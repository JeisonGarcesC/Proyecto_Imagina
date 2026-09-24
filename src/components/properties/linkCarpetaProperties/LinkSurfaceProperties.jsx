import { getLinkFinishOptions } from '../../../mepal/link/rules/linkSurfaceFinishOptions.js';
import { inputStyle, labelStyle } from '../shared/PropertyStyles.js';
export default function LinkSurfaceProperties({ part, config: c, onChange, disabled }) {
  const leader = part.config?.type === 'lider';
  return <fieldset disabled={disabled} style={{ border: 0, padding: 0, minWidth: 0 }}>
    {part.componentRole === 'SURFACE' && !part.config?.leaderCredenza && <label style={labelStyle}>Acabado / tipo de superficie<select style={inputStyle} value={c.finishId} onChange={(e) => onChange({ finishId: e.target.value })}>{getLinkFinishOptions(leader ? 'lider' : 'sencillo').map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>}
    <label style={labelStyle}><input type="checkbox" checked={!!c.grommet} onChange={(e) => onChange({ grommet: e.target.checked })} /> Incluir grommet</label>
    {c.grommet && <><label style={labelStyle}>Acabado del grommet<select style={inputStyle} value={c.grommetFinish} onChange={(e) => onChange({ grommetFinish: e.target.value })}><option value="ALUMINIUM">Aluminio anodizado</option><option value="PAINTED">Pintado</option></select></label>{leader && <label style={labelStyle}>Posición del grommet<select style={inputStyle} value={c.grommetPosition} onChange={(e) => onChange({ grommetPosition: e.target.value })}><option value="LEFT">Izquierda</option><option value="CENTER">Centro</option><option value="RIGHT">Derecha</option></select></label>}</>}
    {leader && <label style={labelStyle}><input type="checkbox" checked={!!c.floorDuct} onChange={(e) => onChange({ floorDuct: e.target.checked })} /> Incluir ducto bajante a piso</label>}
  </fieldset>;
}
