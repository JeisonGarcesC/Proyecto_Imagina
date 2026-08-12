import { useEffect, useRef, useState } from 'react';
import { getDxfUnitDisplayName } from '../utils/dxfUnits.js';

export default function PlanProperties({
  plan,
  planEditMode = false,
  onPlanEditModeChange,
  onVisibleChange,
  onLockedChange,
  onOpacityChange,
  onPositionChange,
  onRotationChange,
  onVectorLayerChange,
  onResetDxfScale,
  onRecalibrate,
  onReplaceFile,
  onDelete,
}) {
  if (!plan) return null;

  const opacity = Math.max(0, Math.min(1, Number(plan.opacity) || 0));
  const status = plan.locked ? 'Bloqueado' : planEditMode ? 'En edición' : 'Desbloqueado';
  const metersPerUnit = Number(plan.calibration?.metersPerDocumentUnit) || 0.01;
  const calibratedDistance = Number(plan.calibration?.realDistanceMeters);

  return (
    <section
      aria-label="Propiedades del plano"
      style={{
        display: 'grid',
        gap: 10,
        marginTop: 12,
        padding: 12,
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        background: '#fff',
        color: '#333',
        fontSize: 12,
      }}
    >
      <strong style={{ fontSize: 13 }}>Propiedades del plano</strong>

      <div style={{ display: 'grid', gap: 3 }}>
        <span style={{ opacity: 0.65 }}>Archivo</span>
        <span style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
          {plan.originalFileName || 'Plano sin nombre'}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>
          Tipo: <strong>{plan.sourceType}</strong>
        </span>
        <span>
          Estado: <strong>{status}</strong>
        </span>
      </div>

      <label style={controlStyle}>
        <input
          type="checkbox"
          checked={plan.visible !== false}
          onChange={(event) => onVisibleChange?.(event.target.checked)}
        />
        Mostrar plano
      </label>

      <label style={controlStyle}>
        <input
          type="checkbox"
          checked={plan.locked !== false}
          onChange={(event) => onLockedChange?.(event.target.checked)}
        />
        Bloquear plano
      </label>

      <label style={{ ...controlStyle, opacity: plan.locked ? 0.55 : 1 }}>
        <input
          type="checkbox"
          checked={planEditMode}
          disabled={plan.locked}
          onChange={(event) => onPlanEditModeChange?.(event.target.checked)}
        />
        Editar plano
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>
          Opacidad: <strong>{Math.round(opacity * 100)}%</strong>
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(opacity * 100)}
          onChange={(event) => onOpacityChange?.(Number(event.target.value) / 100)}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <PositionField
          key={`${plan.id}-position-x`}
          label="Posición X (m)"
          value={plan.transform?.position?.x}
          disabled={plan.locked}
          onChange={(x) =>
            onPositionChange?.({
              x,
              z: plan.transform?.position?.z ?? 0,
            })
          }
        />
        <PositionField
          key={`${plan.id}-position-z`}
          label="Posición Z (m)"
          value={plan.transform?.position?.z}
          disabled={plan.locked}
          onChange={(z) =>
            onPositionChange?.({
              x: plan.transform?.position?.x ?? 0,
              z,
            })
          }
        />
      </div>

      <PositionField
        key={`${plan.id}-rotation`}
        label="Rotación (°)"
        value={((plan.transform?.rotation || 0) * 180) / Math.PI}
        step="1"
        disabled={plan.locked}
        onChange={(degrees) => onRotationChange?.((degrees * Math.PI) / 180)}
      />

      <div style={{ display: 'grid', gap: 3 }}>
        <span>
          Escala actual:{' '}
          <strong>
            1 {plan.renderType === 'VECTOR' ? 'unidad DXF' : 'px'} = {formatScale(metersPerUnit)} m
          </strong>
        </span>
        {Number.isFinite(calibratedDistance) && calibratedDistance > 0 ? (
          <span style={{ opacity: 0.72 }}>
            Calibrado con {calibratedDistance.toFixed(3)} m
          </span>
        ) : null}
      </div>

      {plan.renderType === 'VECTOR' ? (
        <>
          <div style={{ display: 'grid', gap: 3 }}>
            <span>
              Unidad del archivo: <strong>{getDxfUnitDisplayName(plan.vector?.units?.name)}</strong>
            </span>
            <span>
              Escala detectada:{' '}
              <strong>{formatDxfScale(resolveOriginalDxfScale(plan))}</strong>
            </span>
            <span>
              Escala utilizada: <strong>{formatDxfScale(plan.calibration?.metersPerDocumentUnit)}</strong>
            </span>
            <span style={{ opacity: 0.7 }}>
              Recalibración:{' '}
              {plan.calibration?.source === 'MANUAL'
                ? 'Manual'
                : plan.vector?.units?.source === 'USER'
                  ? 'Unidad definida manualmente'
                  : 'Detectada desde DXF'}
            </span>
          </div>
          <VectorLayers
            layers={plan.vector?.layers || []}
            entityCount={plan.vector?.diagnostics?.normalizedEntityCount}
            dimensionCount={plan.vector?.statistics?.dimensions}
            onLayerChange={onVectorLayerChange}
          />
        </>
      ) : null}

      <div style={{ display: 'grid', gap: 7 }}>
        <button type="button" onClick={onRecalibrate} disabled={plan.locked} style={actionStyle}>
          {plan.renderType === 'VECTOR' ? 'Recalibrar DXF' : 'Recalibrar'}
        </button>
        {plan.renderType === 'VECTOR' && resolveOriginalDxfScale(plan) != null ? (
          <button type="button" onClick={onResetDxfScale} disabled={plan.locked} style={actionStyle}>
            Restablecer escala DXF
          </button>
        ) : null}
        <button type="button" onClick={onReplaceFile} style={actionStyle}>
          Reemplazar archivo
        </button>
        <button type="button" onClick={onDelete} style={deleteStyle}>
          Eliminar plano
        </button>
      </div>
    </section>
  );
}

function VectorLayers({ layers, entityCount, dimensionCount, onLayerChange }) {
  const safeLayers = Array.isArray(layers) ? layers : [];

  const setAllVisible = (visible) => {
    safeLayers.forEach((layer) => onLayerChange?.(layer.id, { visible }));
  };

  return (
    <section aria-label="Layers del plano DXF" style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <strong>Layers</strong>
        <span style={{ opacity: 0.65 }}>
          {safeLayers.length} layers
          {Number.isFinite(Number(entityCount)) ? ` · ${Number(entityCount).toLocaleString()} entidades` : ''}
          {Number(dimensionCount) > 0 ? ` · ${Number(dimensionCount).toLocaleString()} cotas` : ''}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" style={compactActionStyle} onClick={() => setAllVisible(true)}>
          Mostrar todos
        </button>
        <button type="button" style={compactActionStyle} onClick={() => setAllVisible(false)}>
          Ocultar todos
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 4,
          maxHeight: 210,
          overflowY: 'auto',
          padding: 5,
          border: '1px solid #e5e7eb',
          borderRadius: 7,
          background: '#f8fafc',
        }}
      >
        {safeLayers.map((layer) => (
          <div
            key={layer.id || layer.name}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto minmax(0, 1fr) auto auto',
              alignItems: 'center',
              gap: 7,
              minHeight: 28,
            }}
          >
            <input
              type="checkbox"
              checked={layer.visible !== false}
              onChange={(event) =>
                onLayerChange?.(layer.id, { visible: event.target.checked })
              }
              aria-label={`Mostrar layer ${layer.name}`}
            />
            <span
              title={layer.lineType ? `${layer.name} · ${layer.lineType}` : layer.name}
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {layer.name || '0'}
              {layer.lineType ? <small style={{ opacity: 0.55 }}> · {layer.lineType}</small> : null}
            </span>
            <span
              title={layer.color || (layer.aciColor != null ? `ACI ${layer.aciColor}` : 'Sin color')}
              aria-label={`Color del layer ${layer.name}`}
              style={{
                width: 13,
                height: 13,
                borderRadius: 3,
                border: '1px solid rgba(0,0,0,0.25)',
                background: isHexColor(layer.color) ? layer.color : '#64748b',
              }}
            />
            <label title={layer.locked ? 'Desbloquear layer' : 'Bloquear layer'}>
              <input
                type="checkbox"
                checked={layer.locked === true}
                onChange={(event) =>
                  onLayerChange?.(layer.id, { locked: event.target.checked })
                }
                aria-label={`Bloquear layer ${layer.name}`}
              />
              <span aria-hidden="true">🔒</span>
            </label>
          </div>
        ))}
        {!safeLayers.length ? <span style={{ opacity: 0.65 }}>Sin layers disponibles.</span> : null}
      </div>
    </section>
  );
}

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || ''));
}

function PositionField({ label, value, step = '0.01', disabled, onChange }) {
  const inputRef = useRef(null);
  const numericValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [draft, setDraft] = useState(() => formatPosition(numericValue));

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDraft(formatPosition(numericValue));
    }
  }, [numericValue]);

  return (
    <label style={{ display: 'grid', gap: 5, opacity: disabled ? 0.55 : 1 }}>
      <span>{label}</span>
      <input
        ref={inputRef}
        type="number"
        step={step}
        value={draft}
        disabled={disabled}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          if (nextDraft.trim() === '') return;

          const nextValue = Number(nextDraft);
          if (Number.isFinite(nextValue)) onChange?.(nextValue);
        }}
        onBlur={() => setDraft(formatPosition(numericValue))}
        style={{
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          padding: '7px 8px',
          border: '1px solid #d8d8d8',
          borderRadius: 7,
          background: disabled ? '#f3f4f6' : '#fff',
        }}
      />
    </label>
  );
}

function formatPosition(value) {
  return String(Math.round(value * 1000) / 1000);
}

function formatScale(value) {
  return Number(value).toPrecision(6).replace(/\.?0+$/, '');
}

function resolveOriginalDxfScale(plan) {
  const stored = Number(plan?.calibration?.originalMetersPerDocumentUnit);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const detected = Number(plan?.vector?.units?.metersPerUnit);
  return plan?.vector?.units?.detected && Number.isFinite(detected) && detected > 0
    ? detected
    : null;
}

function formatDxfScale(value) {
  const scale = Number(value);
  return Number.isFinite(scale) && scale > 0
    ? `1 unidad = ${formatScale(scale)} m`
    : 'No disponible';
}

const controlStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontWeight: 600,
};

const actionStyle = {
  padding: '7px 9px',
  border: '1px solid #d1d5db',
  borderRadius: 7,
  background: '#fff',
  cursor: 'pointer',
  fontWeight: 650,
};

const compactActionStyle = {
  ...actionStyle,
  padding: '5px 7px',
  fontSize: 11,
};

const deleteStyle = {
  ...actionStyle,
  borderColor: '#fecaca',
  color: '#b91c1c',
};
