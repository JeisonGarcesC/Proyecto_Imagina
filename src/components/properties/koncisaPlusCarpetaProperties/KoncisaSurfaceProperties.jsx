import { useState } from 'react';
import { KONCISA_SURFACE_FINISH_OPTIONS } from '../../../mepal/koncisaPlus/rules/koncisaSurfaceFinishOptions.js';
import { inputStyle, labelStyle, sectionStyle } from '../shared/PropertyStyles.js';

export default function KoncisaSurfaceProperties({ part, api }) {
  const initial = part?.meta?.componentConfig || {};
  const [config, setConfig] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const leaderRole = String(part?.meta?.leaderRole || '').toUpperCase();
  const isSimpleReturn = part?.meta?.componentKey === 'SIMPLE_RETURN_SURFACE';
  const [returnState, setReturnState] = useState(
    () => api?.getSelectedKoncisaSimpleReturnConfig?.(part?.parentAssemblyId) || null
  );
  const moduleIndex = Number(part?.meta?.moduleIndex);
  const canConfigureReturn =
    returnState?.tipoPuesto === 'sencillo' &&
    (isSimpleReturn || moduleIndex === 0 || moduleIndex === returnState.puestos - 1);
  const isLeaderSurface = leaderRole === 'MAIN' || leaderRole === 'RETURN';
  const canConfigureCableAccess = leaderRole !== 'MAIN' || part?.meta?.allowMainGrommet === true;
  const finishOptions =
    leaderRole === 'MAIN'
      ? KONCISA_SURFACE_FINISH_OPTIONS.filter((option) =>
          ['FORMICA_30', 'MELAMINICO_25'].includes(option.id)
        )
      : KONCISA_SURFACE_FINISH_OPTIONS;
  const canChangeFinish = leaderRole !== 'RETURN' && !isSimpleReturn;

  async function updateReturn(patch) {
    setBusy(true);
    setError('');
    try {
      const result = await api?.updateSelectedKoncisaSimpleReturn?.(patch, part?.parentAssemblyId);
      if (!result?.success) throw new Error(result?.reason || 'No se pudo actualizar el retorno.');
      setReturnState((current) => ({ ...current, ...patch }));
    } catch (cause) {
      setError(cause?.message || 'No se pudo actualizar el retorno.');
    } finally {
      setBusy(false);
    }
  }

  async function update(patch) {
    setBusy(true);
    setError('');
    try {
      const result = await api?.updateSelectedKoncisaSurface?.(
        part?.meta?.componentKey,
        patch,
        part?.parentAssemblyId
      );
      if (!result?.success)
        throw new Error(result?.reason || 'No se pudo actualizar la superficie.');
      setConfig((current) => ({ ...current, ...patch }));
    } catch (cause) {
      setError(cause?.message || 'No se pudo actualizar la superficie.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset disabled={busy} style={{ ...sectionStyle, border: 0, minWidth: 0 }}>
      {canConfigureReturn && (
        <fieldset style={{ border: '1px solid #ddd' }}>
          <legend>Retorno SENCILLO</legend>
          {isSimpleReturn && (
            <div>
              Puesto {Number(returnState?.targetModuleIndex || 0) + 1} ·{returnState?.widthMm} mm
              {Number(returnState?.widthMm) === 900 ? ' — ESPECIAL' : ''}
              {' · '}
              {returnState?.side}
            </div>
          )}
          <label style={labelStyle}>
            <input
              type="checkbox"
              checked={returnState?.enabled === true}
              onChange={(event) => updateReturn({ enabled: event.target.checked })}
            />{' '}
            Activar retorno
          </label>
          {returnState?.enabled && (
            <>
              <label style={labelStyle}>
                Medida
                <select
                  style={inputStyle}
                  value={returnState.widthMm || 1000}
                  onChange={(event) => updateReturn({ widthMm: Number(event.target.value) })}
                >
                  <option value={900}>900 mm — ESPECIAL</option>
                  <option value={1000}>1000 mm</option>
                </select>
              </label>
              {returnState.puestos > 1 && (
                <label style={labelStyle}>
                  Puesto propietario
                  <select
                    style={inputStyle}
                    value={returnState.targetModuleIndex}
                    onChange={(event) =>
                      updateReturn({ targetModuleIndex: Number(event.target.value) })
                    }
                  >
                    <option value={0}>Inicial — puesto 0</option>
                    <option value={returnState.puestos - 1}>
                      Final — puesto {returnState.puestos - 1}
                    </option>
                  </select>
                </label>
              )}
              <label style={labelStyle}>
                Lado
                <select
                  style={inputStyle}
                  value={returnState.side || 'RIGHT'}
                  onChange={(event) => updateReturn({ side: event.target.value })}
                >
                  <option value="LEFT">LEFT</option>
                  <option value="RIGHT">RIGHT</option>
                </select>
              </label>
              {isSimpleReturn && (
                <label style={labelStyle}>
                  Ubicación del retorno
                  <select
                    style={inputStyle}
                    value={returnState.returnOrientation || 'BACK'}
                    onChange={(event) => updateReturn({ returnOrientation: event.target.value })}
                  >
                    <option value="FRONT">Frente</option>
                    <option value="BACK">Atrás</option>
                  </select>
                </label>
              )}
              <label style={labelStyle}>
                <input
                  type="checkbox"
                  checked={returnState.ductEnabled === true}
                  onChange={(event) => updateReturn({ ductEnabled: event.target.checked })}
                />{' '}
                Ducto compatible con la medida
              </label>
              {returnState.ductEnabled && (
                <label style={labelStyle}>
                  Tipo de ducto
                  <select
                    style={inputStyle}
                    value={returnState.ductType || 'TERMINAL'}
                    onChange={(event) => updateReturn({ ductType: event.target.value })}
                  >
                    <option value="TERMINAL">Terminal</option>
                    <option value="INTERMEDIO">Intermedio</option>
                    {config.cableAccessType !== 'PASACABLE' && (
                      <option value="INDIVIDUAL">Individual</option>
                    )}
                  </select>
                </label>
              )}
              <label style={labelStyle}>
                <input
                  type="checkbox"
                  checked={returnState.pedestal?.enabled === true}
                  onChange={(event) =>
                    updateReturn({
                      pedestal: {
                        ...returnState.pedestal,
                        enabled: event.target.checked,
                        placementSide: returnState.pedestal?.placementSide || 'RIGHT',
                      },
                    })
                  }
                />{' '}
                Sustituir costado por pedestal
              </label>
              {returnState.pedestal?.enabled && (
                <label style={labelStyle}>
                  Posición del pedestal
                  <select
                    style={inputStyle}
                    value={returnState.pedestal?.placementSide || 'RIGHT'}
                    onChange={(event) =>
                      updateReturn({
                        pedestal: { ...returnState.pedestal, placementSide: event.target.value },
                      })
                    }
                  >
                    <option value="LEFT">Izquierda</option>
                    <option value="RIGHT">Derecha</option>
                  </select>
                </label>
              )}
            </>
          )}
        </fieldset>
      )}
      {canChangeFinish && (
        <label style={labelStyle}>
          Acabado / espesor
          <select
            style={inputStyle}
            value={config.finishId || 'FORMICA_30'}
            onChange={(event) => update({ finishId: event.target.value })}
          >
            {finishOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {canConfigureCableAccess && (
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={
              isLeaderSurface
                ? config.cableAccessType === 'GROMMET'
                : config.cableAccessType !== 'NONE'
            }
            onChange={(event) =>
              update({ cableAccessType: event.target.checked ? 'GROMMET' : 'NONE' })
            }
          />{' '}
          {isLeaderSurface ? 'Incluir Grommet' : 'Incluir acceso para cables'}
        </label>
      )}
      {canConfigureCableAccess && !isLeaderSurface && config.cableAccessType !== 'NONE' && (
        <label style={labelStyle}>
          Tipo de acceso
          <select
            style={inputStyle}
            value={config.cableAccessType || 'GROMMET'}
            onChange={(event) => update({ cableAccessType: event.target.value })}
          >
            <option value="GROMMET">Grommet</option>
            <option value="PASACABLE">Pasacable</option>
          </select>
        </label>
      )}
      {canConfigureCableAccess && config.cableAccessType === 'GROMMET' && (
        <>
          <label style={labelStyle}>
            Acabado del grommet
            <select
              style={inputStyle}
              value={config.grommetFinish || 'ALUMINIUM'}
              onChange={(event) => update({ grommetFinish: event.target.value })}
            >
              <option value="ALUMINIUM">Aluminio anodizado</option>
              <option value="PAINTED">Pintado</option>
            </select>
          </label>
          {leaderRole === 'RETURN' && (
            <label style={labelStyle}>
              Posición del grommet
              <select
                style={inputStyle}
                value={config.grommetPosition || 'CENTER'}
                onChange={(event) => update({ grommetPosition: event.target.value })}
              >
                {(!config.grommetPosition || config.grommetPosition === 'CENTER') && (
                  <option value="CENTER">Centro (configuración anterior)</option>
                )}
                <option value="LEFT">Izquierda</option>
                <option value="RIGHT">Derecha</option>
              </select>
            </label>
          )}
        </>
      )}
      {canConfigureCableAccess &&
        !isLeaderSurface &&
        !isSimpleReturn &&
        config.cableAccessType === 'PASACABLE' && (
          <>
            <label style={labelStyle}>
              Posición del pasacable
              <select
                style={inputStyle}
                value={config.pasacablePosition || 'CENTER'}
                onChange={(event) => update({ pasacablePosition: event.target.value })}
              >
                <option value="LEFT">Izquierda</option>
                <option value="CENTER">Centro</option>
                <option value="RIGHT">Derecha</option>
              </select>
            </label>
          </>
        )}
      {error && (
        <div role="alert" style={{ color: '#b91c1c', fontSize: 12 }}>
          {error}
        </div>
      )}
    </fieldset>
  );
}
