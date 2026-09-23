import { useState } from 'react';
import { KONCISA_SURFACE_FINISH_OPTIONS } from '../../../mepal/koncisaPlus/rules/koncisaSurfaceFinishOptions.js';
import { inputStyle, labelStyle, sectionStyle } from '../shared/PropertyStyles.js';

export default function KoncisaSurfaceProperties({ part, api }) {
  const initial = part?.meta?.componentConfig || {};
  const [config, setConfig] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const leaderRole = String(part?.meta?.leaderRole || '').toUpperCase();
  const finishOptions = leaderRole === 'MAIN'
    ? KONCISA_SURFACE_FINISH_OPTIONS.filter((option) => ['FORMICA_30', 'MELAMINICO_25'].includes(option.id))
    : KONCISA_SURFACE_FINISH_OPTIONS;
  const canChangeFinish = leaderRole !== 'RETURN';

  async function update(patch) {
    setBusy(true); setError('');
    try {
      const result = await api?.updateSelectedKoncisaSurface?.(
        part?.meta?.componentKey,
        patch,
        part?.parentAssemblyId
      );
      if (!result?.success) throw new Error(result?.reason || 'No se pudo actualizar la superficie.');
      setConfig((current) => ({ ...current, ...patch }));
    } catch (cause) {
      setError(cause?.message || 'No se pudo actualizar la superficie.');
    } finally {
      setBusy(false);
    }
  }

  return <fieldset disabled={busy} style={{ ...sectionStyle, border: 0, minWidth: 0 }}>
    {canChangeFinish && <label style={labelStyle}>Acabado / espesor
      <select style={inputStyle} value={config.finishId || 'FORMICA_30'} onChange={(event) => update({ finishId: event.target.value })}>
        {finishOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>}
    <label style={labelStyle}><input type="checkbox" checked={config.cableAccessType !== 'NONE'} onChange={(event) => update({ cableAccessType: event.target.checked ? 'GROMMET' : 'NONE' })} /> Incluir acceso para cables</label>
    {config.cableAccessType !== 'NONE' && <label style={labelStyle}>Tipo de acceso
      <select style={inputStyle} value={config.cableAccessType || 'GROMMET'} onChange={(event) => update({ cableAccessType: event.target.value })}>
        <option value="GROMMET">Grommet</option>
        <option value="PASACABLE">Pasacable</option>
      </select>
    </label>}
    {config.cableAccessType === 'GROMMET' && <>
      <label style={labelStyle}>Acabado del grommet
        <select style={inputStyle} value={config.grommetFinish || 'ALUMINIUM'} onChange={(event) => update({ grommetFinish: event.target.value })}>
          <option value="ALUMINIUM">Aluminio anodizado</option>
          <option value="PAINTED">Pintado</option>
        </select>
      </label>
    </>}
    {config.cableAccessType === 'PASACABLE' && <>
      <label style={labelStyle}>Posición del pasacable
        <select style={inputStyle} value={config.pasacablePosition || 'CENTER'} onChange={(event) => update({ pasacablePosition: event.target.value })}>
          <option value="LEFT">Izquierda</option><option value="CENTER">Centro</option><option value="RIGHT">Derecha</option>
        </select>
      </label>
    </>}
    {error && <div role="alert" style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}
  </fieldset>;
}
