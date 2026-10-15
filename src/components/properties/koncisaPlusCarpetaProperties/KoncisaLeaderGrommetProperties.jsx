import { useState } from 'react';
import { labelStyle, sectionStyle } from '../shared/PropertyStyles.js';
import { resolveKoncisaCableAccessCodigoPT } from '../../../mepal/koncisaPlus/rules/koncisaCableAccessRules.js';

export default function KoncisaLeaderGrommetProperties({ part, api }) {
  const finish = part?.meta?.finish || '';
  const isReturn = part?.meta?.targetSurfaceRole === 'RETURN';
  const configuredPosition =
    part?.meta?.componentConfig?.grommetPosition ||
    (['LEFT', 'RIGHT'].includes(part?.meta?.position) ? part.meta.position : '');
  const [position, setPosition] = useState(configuredPosition);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const commercialCode = resolveKoncisaCableAccessCodigoPT({
    tipo: 'grommet',
    layoutType: 'LEADER',
    finish: finish || null,
  }).codigoPT;

  async function updatePosition(nextPosition) {
    setBusy(true);
    setError('');
    try {
      const result = await api?.updateSelectedKoncisaSurface?.(
        part?.meta?.targetSurfaceKey,
        { grommetPosition: nextPosition },
        part?.parentAssemblyId
      );
      if (!result?.success) throw new Error(result?.reason || 'No se pudo actualizar la posición.');
      setPosition(nextPosition);
    } catch (cause) {
      setError(cause?.message || 'No se pudo actualizar la posición.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset disabled={busy} style={{ ...sectionStyle, border: 0, minWidth: 0 }}>
      <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>
        Componente: Grommet LKAC670000
      </div>
      <div style={{ fontSize: 12, marginBottom: 6 }}>Código base: LKAC670000</div>
      <div style={{ fontSize: 12, marginBottom: 8 }}>Tipo: Grommet</div>
      <div style={{ fontSize: 12, marginBottom: 8 }}>Superficie: {isReturn ? 'RETURN' : 'MAIN'}</div>
      {finish && (
        <div style={{ fontSize: 12, marginBottom: 8 }}>
          Acabado de superficie: {finish === 'PAINTED' ? 'Pintado' : 'Anodizado'}
          {commercialCode ? ` (${commercialCode})` : ''}
        </div>
      )}
      {isReturn && <label style={labelStyle}>
        Posición
        <select
          value={position}
          onChange={(event) => updatePosition(event.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 4 }}
        >
          {!position && (
            <option value="">
              {part?.meta?.position === 'CENTER' ? 'Centro (configuración anterior)' : 'Selecciona'}
            </option>
          )}
          <option value="LEFT">Izquierda</option>
          <option value="RIGHT">Derecha</option>
        </select>
      </label>}
      {error && (
        <div role="alert" style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>
          {error}
        </div>
      )}
    </fieldset>
  );
}
