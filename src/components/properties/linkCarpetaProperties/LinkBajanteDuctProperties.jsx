import { inputStyle, labelStyle } from '../shared/PropertyStyles.js';
export default function LinkBajanteDuctProperties({ part, config: c, onChange, disabled }) {
  const floor = part.componentRole === 'FLOOR_DUCT', ceiling = part.componentRole === 'CEILING_DUCT';
  const remove = floor ? { floorDuct: false } : ceiling ? { ceilingSide: 'NONE' } : { [part.meta?.side === 'Left' ? 'coverLeft' : 'coverRight']: false };
  return <fieldset disabled={disabled} style={{ border: 0, padding: 0, minWidth: 0 }}>
    {floor && part.configTargetKey?.startsWith('duct-') && <label style={labelStyle}>Acabado del bajante<select style={inputStyle} value={c.supportFinish || 'PINTADO'} onChange={(e) => onChange({ supportFinish: e.target.value })}><option value="PINTADO">Pintado</option><option value="CROMADO">Cromado</option></select></label>}
    <button type="button" onClick={() => onChange(remove)}>Quitar {floor ? 'bajante a piso' : ceiling ? 'bajante a techo' : 'tapa'}</button>
  </fieldset>;
}
