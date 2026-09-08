import { useEffect, useState } from 'react';
import { sectionStyle } from './shared/PropertyStyles';

function normalizeMoreaLine(part) {
  return String(
    part?.line ||
    part?.meta?.line ||
    part?.userData?.line ||
    part?.userData?.meta?.line ||
    ''
  )
    .trim()
    .toUpperCase();
}

function normalizeMoreaVariant(part) {
  return String(part?.moreaVariant || part?.meta?.moreaVariant || 'single')
    .trim()
    .toLowerCase();
}

export function isMoreaEditablePart(part) {
  if (!part) return false;
  const line = normalizeMoreaLine(part);
  const role = String(
    part?.role ||
    part?.meta?.role ||
    part?.userData?.role ||
    part?.userData?.meta?.role ||
    ''
  )
    .trim()
    .toLowerCase();

  if (
    part.kind === 'MOREA_GIRO_SURFACE' ||
    part.type === 'MOREA_GIRO_SURFACE' ||
    role === 'giro-surface'
  ) {
    return false;
  }

  return (
    line === 'MOREA' ||
    part.kind === 'MOREA_ASSEMBLY' ||
    Boolean(part?.moreaVariant || part?.meta?.moreaVariant || part?.moreaPedestalMode || part?.meta?.moreaPedestalMode)
  );
}

function resolveMoreaSeatTarget(part) {
  const seats = Array.isArray(part?.seats) ? part.seats : [];
  if (!seats.length) {
    return {
      instanceId: part?.instanceId || part?.userData?.instanceId || part?.uuid || null,
      code: part?.code || part?.codigoPT || null,
      seatMode: String(part?.seatMode || part?.meta?.seatMode || 'chair').trim().toLowerCase(),
      label: part?.description || 'Puesto 1',
    };
  }

  const clickedIndex = Number(part?.clickedSeatIndex ?? 0);
  const seat = seats[Math.min(Math.max(clickedIndex, 0), seats.length - 1)] || seats[0];
  return {
    instanceId: seat?.instanceId || part?.instanceId || part?.userData?.instanceId || part?.uuid || null,
    code: seat?.code || part?.code || part?.codigoPT || null,
    seatMode: String(seat?.seatMode || part?.seatMode || part?.meta?.seatMode || 'chair').trim().toLowerCase(),
    label: seat?.label || `Puesto ${Math.min(Math.max(clickedIndex, 0), seats.length - 1) + 1}`,
  };
}

function resolveMoreaPedestalMode(part) {
  return String(part?.moreaPedestalMode || part?.meta?.moreaPedestalMode || 'normal')
    .trim()
    .toLowerCase();
}

export default function MoreaProperties({ part, api, onClose }) {
  const isEditable = isMoreaEditablePart(part);

  const seatTarget = resolveMoreaSeatTarget(part);
  const moreaVariant = normalizeMoreaVariant(part);
  const pedestalMode = resolveMoreaPedestalMode(part);
  const canRotateBackrest = moreaVariant === 'single' && seatTarget.seatMode === 'chair';
  const backrestRotated180 = Boolean(part?.backrestRotated180 ?? part?.meta?.backrestRotated180);
  const [localBackrestRotated180, setLocalBackrestRotated180] = useState(backrestRotated180);

  useEffect(() => {
    setLocalBackrestRotated180(backrestRotated180);
  }, [backrestRotated180, seatTarget.instanceId, seatTarget.seatMode]);

  if (!isEditable) return null;

  async function handleSeatModeChange(e) {
    const targetMode = e.target.value;
    if (targetMode === seatTarget.seatMode) return;
    if (!api?.swapMoreaSeatVariant || !seatTarget.instanceId) return;

    if (localBackrestRotated180 && targetMode !== 'chair' && api?.toggleMoreaSeatBackrestRotation) {
      setLocalBackrestRotated180(false);
      await api.toggleMoreaSeatBackrestRotation(seatTarget.instanceId, false);
    }

    await api.swapMoreaSeatVariant(seatTarget.instanceId, seatTarget.code, targetMode);
    onClose?.();
  }

  async function handleBackrestChange(e) {
    const next = e.target.checked;
    if (!api?.toggleMoreaSeatBackrestRotation || !seatTarget.instanceId) return;
    if (!canRotateBackrest) return;
    if (next === localBackrestRotated180) return;

    setLocalBackrestRotated180(next);
    await api.toggleMoreaSeatBackrestRotation(seatTarget.instanceId, next);
  }

  async function handlePedestalChange(e) {
    const targetMode = e.target.value;
    if (targetMode === pedestalMode) return;
    if (!api?.swapMoreaPedestalVariant) return;

    const targetId =
      part?.assemblyGroupId ||
      part?.groupId ||
      part?.parentAssemblyId ||
      part?.instanceId ||
      part?.userData?.instanceId ||
      part?.userData?.groupId ||
      part?.userData?.parentAssemblyId ||
      null;

    if (!targetId) return;

    await api.swapMoreaPedestalVariant(targetId, targetMode);
    onClose?.();
  }

  return (
    <div style={sectionStyle}>
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#111827' }}>
        Morea
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: 2 }}>
            Configuración del puesto
          </label>
          <select
            value={seatTarget.seatMode}
            onChange={handleSeatModeChange}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#fff',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <option value="chair">Silla</option>
            <option value="cushion">Sofá / cojin</option>
            <option value="table">Mesa</option>
            <option value="tableGrommet">Mesa con grommet</option>
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#374151' }}>
          <input
            type="checkbox"
            checked={localBackrestRotated180}
            disabled={!canRotateBackrest}
            onChange={handleBackrestChange}
          />
          Girar respaldo 180°
        </label>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: 2 }}>
            Patas / pedestal
          </label>
          <select
            value={pedestalMode}
            onChange={handlePedestalChange}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#fff',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <option value="normal">Normal</option>
            <option value="wood">Madera</option>
            <option value="metal">Metálico</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280' }}>
        Variante: {moreaVariant === 'double' ? 'doble' : 'simple'}
      </div>
    </div>
  );
}
