import { useState, useMemo } from 'react';
import { LINK_SUPPORT_SHAPES } from '../../../mepal/link/rules/linkSurfaceFinishOptions.js';
import { LINK_LEADER_PEDESTALS } from '../../../mepal/link/leader/rules/leaderPedestalRules.js';
import { inputStyle, labelStyle, btnStyle, dangerBtnStyle } from '../shared/PropertyStyles.js';

export default function LinkCostadoProperties({ part, config: c, onChange, disabled, api }) {
  const pedestal = part.componentRole === 'PEDESTAL' || Boolean(c.pedestal);
  const isReturnSupport = part.leaderRole === 'RETURN_END' || part.configTargetKey === 'return-support' || part.componentKey === 'return-support' || part.meta?.pedestalTarget || part.componentRole === 'PEDESTAL';
  
  const isTerminal = part.meta?.terminal === true;
  const isIntegrationLeg = part?.meta?.isIntegrationLeg === true || part?.meta?.replacesCostado === true || Boolean(part?.meta?.integrationSetId);
  const canUseIntegration = isTerminal && !isIntegrationLeg && part.config?.type === 'doble';

  const [integrationWidthMm, setIntegrationWidthMm] = useState(1200);
  const [integrationDepthMm, setIntegrationDepthMm] = useState(() => {
    const depth = Number(c.depthMm) || 600;
    return depth >= 750 ? 750 : 600;
  });
  const [cableAccessType, setCableAccessType] = useState('grommet');

  const handleAddIntegration = async () => {
    const side = part.componentKey?.endsWith('-0') ? 'LEFT' : 'RIGHT';
    await api?.replaceSelectedCostadoWithIntegration?.({
      side,
      componentKey: part.componentKey,
      widthMm: Number(integrationWidthMm),
      depthMm: Number(integrationDepthMm),
      cableAccessType,
      finishCode: '22008689',
      thickMm: 30,
    });
  };

  return <fieldset disabled={disabled} style={{ border: 0, padding: 0, minWidth: 0 }}>
    {!pedestal && (
      <>
        <label style={labelStyle}>
          Forma del costado
          <select style={inputStyle} value={c.shape} onChange={(e) => onChange({ shape: e.target.value })}>
            {LINK_SUPPORT_SHAPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Acabado del costado
          <select style={inputStyle} value={c.supportFinish} onChange={(e) => onChange({ supportFinish: e.target.value })}>
            <option value="PINTADO">Pintado</option>
            <option value="CROMADO">Cromado</option>
          </select>
        </label>
        <label style={labelStyle}>
          Tipo de costado
          <select
            style={inputStyle}
            value={c.terminal !== undefined ? (c.terminal ? 'terminal' : 'intermedio') : (isTerminal ? 'terminal' : 'intermedio')}
            onChange={(e) => onChange({ terminal: e.target.value === 'terminal' })}
          >
            <option value="terminal">Terminal</option>
            <option value="intermedio">Intermedio</option>
          </select>
        </label>
        {(c.terminal !== undefined ? c.terminal : isTerminal) && !isIntegrationLeg && part.config?.hasDuct !== false && (
          <label style={labelStyle}>
            <input type="checkbox" checked={c.hasTapa !== false} onChange={(e) => onChange({ hasTapa: e.target.checked })} /> Tapa terminal del ducto
          </label>
        )}
      </>
    )}

    {isReturnSupport && (
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
        <label style={labelStyle}>Pedestal de retorno</label>
        {pedestal ? (
          <>
            <div style={{ fontSize: 11, lineHeight: 1.4, opacity: 0.75, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, marginBottom: 8 }}>
              El costado de retorno ha sido reemplazado por este pedestal.
            </div>
            <label style={{ ...labelStyle, fontSize: 11 }}>Modelo de pedestal</label>
            <select
              style={inputStyle}
              value={c.pedestalModel || '22000020563'}
              onChange={(e) => onChange({ pedestalModel: e.target.value })}
            >
              {LINK_LEADER_PEDESTALS.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>

            <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Posición del pedestal (pasos de 65 mm)</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>
                Desplaza el pedestal hacia adelante o atrás en la superficie de retorno.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button
                  type="button"
                  style={btnStyle}
                  onClick={() => onChange({ pedestalOffsetMm: (Number(c.pedestalOffsetMm) || 0) + 65 })}
                >
                  Mover adelante
                </button>
                <button
                  type="button"
                  style={btnStyle}
                  onClick={() => onChange({ pedestalOffsetMm: (Number(c.pedestalOffsetMm) || 0) - 65 })}
                >
                  Mover atrás
                </button>
              </div>
              {Number(c.pedestalOffsetMm || 0) !== 0 && (
                <button
                  type="button"
                  style={{ ...btnStyle, fontSize: 11, background: '#f8fafc', color: '#475569', borderColor: '#cbd5e1' }}
                  onClick={() => onChange({ pedestalOffsetMm: 0 })}
                >
                  Restablecer posición ({c.pedestalOffsetMm > 0 ? `+${c.pedestalOffsetMm}` : c.pedestalOffsetMm} mm)
                </button>
              )}
            </div>

            <button
              type="button"
              style={{ ...dangerBtnStyle, marginTop: 12, width: '100%' }}
              onClick={() => onChange({ pedestal: false, pedestalOffsetMm: 0 })}
            >
              Quitar pedestal y restaurar costado
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, lineHeight: 1.4, opacity: 0.75, marginBottom: 8 }}>
              Reemplaza este costado por un pedestal bajo la superficie de retorno.
            </div>
            <label style={{ ...labelStyle, fontSize: 11 }}>Modelo de pedestal</label>
            <select
              style={inputStyle}
              value={c.pedestalModel || '22000020563'}
              onChange={(e) => onChange({ pedestalModel: e.target.value })}
            >
              {LINK_LEADER_PEDESTALS.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
            <button
              type="button"
              style={{ ...btnStyle, marginTop: 10, background: '#0f766e', borderColor: '#0f766e', width: '100%' }}
              onClick={() => onChange({ pedestal: true, pedestalModel: c.pedestalModel || '22000020563', pedestalOffsetMm: 0 })}
            >
              Cambiar costado por pedestal
            </button>
          </>
        )}
      </div>
    )}

    {!pedestal && !isReturnSupport && (
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
        <label style={labelStyle}>Puesto de integración</label>

        {isIntegrationLeg && (
          <>
            <div style={{ fontSize: 11, lineHeight: 1.4, opacity: 0.75, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
              Este costado pertenece a un puesto de integración.
            </div>
            <button type="button" style={{ ...btnStyle, marginTop: 10, background: '#b91c1c', borderColor: '#b91c1c' }} onClick={async () => { await api?.removeSelectedIntegrationAndRestoreCostado?.(); }}>
              Quitar puesto de integración
            </button>
          </>
        )}

        {!isIntegrationLeg && !canUseIntegration ? (
          <div style={{ fontSize: 11, lineHeight: 1.4, opacity: 0.65, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
            Disponible solo para costados terminales de mesas Link dobles.
          </div>
        ) : !isIntegrationLeg && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 11 }}>Largo</label>
                <select style={inputStyle} value={integrationWidthMm} onChange={(e) => setIntegrationWidthMm(Number(e.target.value))}>
                  <option value={1200}>120 cm</option>
                  <option value={1500}>150 cm</option>
                </select>
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 11 }}>Fondo</label>
                <select style={inputStyle} value={integrationDepthMm} onChange={(e) => setIntegrationDepthMm(Number(e.target.value))}>
                  <option value={600}>60 cm</option>
                  <option value={750}>75 cm</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ ...labelStyle, fontSize: 11 }}>Acceso de cableado</label>
              <select style={inputStyle} value={cableAccessType} onChange={(e) => setCableAccessType(e.target.value)}>
                <option value="grommet">Grommet aluminio 4 tomas</option>
                <option value="pasacable">Pasacable gris claro</option>
              </select>
            </div>
            <button type="button" style={{ ...btnStyle, marginTop: 10, background: '#0f766e', borderColor: '#0f766e' }} onClick={handleAddIntegration}>
              Agregar puesto de integración
            </button>
            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65, lineHeight: 1.35 }}>
              Esta acción reemplaza el costado terminal por un costado doble de integración y agrega la superficie, ducto individual, acople, refuerzo y costados unitarios.
            </div>
          </>
        )}
      </div>
    )}

    {part.leaderRole === 'MAIN_RETURN_JUNCTION' && <label style={labelStyle}><input type="checkbox" checked={!!c.hasOutletBox} onChange={(e) => onChange({ hasOutletBox: e.target.checked })} /> Incluir caja de tomas</label>}
  </fieldset>;
}
