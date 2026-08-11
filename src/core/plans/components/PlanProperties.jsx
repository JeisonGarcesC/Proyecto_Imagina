import { useEffect, useRef, useState } from 'react';

export default function PlanProperties({
  plan,
  planEditMode = false,
  onPlanEditModeChange,
  onVisibleChange,
  onLockedChange,
  onOpacityChange,
  onPositionChange,
  onRotationChange,
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
          Escala actual: <strong>1 px = {formatScale(metersPerUnit)} m</strong>
        </span>
        {Number.isFinite(calibratedDistance) && calibratedDistance > 0 ? (
          <span style={{ opacity: 0.72 }}>
            Calibrado con {calibratedDistance.toFixed(3)} m
          </span>
        ) : null}
      </div>

      <div style={{ display: 'grid', gap: 7 }}>
        <button type="button" onClick={onRecalibrate} disabled={plan.locked} style={actionStyle}>
          Recalibrar
        </button>
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

const deleteStyle = {
  ...actionStyle,
  borderColor: '#fecaca',
  color: '#b91c1c',
};
