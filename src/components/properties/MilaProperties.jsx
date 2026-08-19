import { sectionStyle } from './shared/PropertyStyles';

const MILA_SINGLE_SEAT_CODE_TO_MODE = {
  'TKSSI011000-W-SEAT': 'chair',
  '22000127935': 'chair',
  '22000127936': 'chair',
  TKSSU165000: 'table',
  '22000130198': 'table',
  '22000130199': 'table',
  TKSSU165000_GROMMET: 'tableGrommet',
};

function resolveMilaModeFromPart(part) {
  if (part?.meta?.seatMode) return part.meta.seatMode;
  if (part?.seatMode) return part.seatMode;
  const normalized = String(part?.code || part || '').trim().toUpperCase();
  return MILA_SINGLE_SEAT_CODE_TO_MODE[normalized] || 'chair';
}

export function isMilaGiroEditablePart(part) {
  if (!part) return false;
  const code = String(part.code || part.codigoPT || '');
  return (
    part.kind === 'MILA_GIRO_SURFACE' ||
    part.type === 'MILA_GIRO_SURFACE' ||
    part.meta?.role === 'giro-surface' ||
    (code.startsWith('TKSSU') && !code.includes('165000')) ||
    ['22000127783', '22000127784', '22000127785', '22000127786', '22000127787', '22000127788', '22000127789', '22000127790'].includes(code)
  );
}

export function isMilaEditablePart(part) {
  if (!part) return false;
  // Excluir Superficies de Giro (tienen su propio panel con selector de Grommet)
  if (isMilaGiroEditablePart(part)) {
    return false;
  }
  // Solo Mila simple (excluir Mila Doble)
  if (
    part.line === 'MILA_DOUBLE' ||
    part.category === 'mila-double' ||
    part.kind === 'MILA_DOUBLE' ||
    String(part.groupName || '').toLowerCase().includes('doble')
  ) {
    return false;
  }
  return (
    part.line === 'MILA' ||
    part.kind === 'MILA_ASSEMBLY' ||
    (part.kind === 'GLB_PART' && part.line === 'MILA')
  );
}

export function MilaGiroProperties({ part, api, onClose }) {
  if (!isMilaGiroEditablePart(part)) return null;

  const instanceId = part.instanceId || part.userData?.instanceId || part.uuid;
  const angleDeg = Number(
    part.angleDeg || part.meta?.angleDeg || part.userData?.meta?.angleDeg || part.userData?.angleDeg || 60
  );
  const isGrommet = Boolean(
    part.useGrommet ??
    part.meta?.useGrommet ??
    part.userData?.meta?.useGrommet ??
    String(part.code || '').toUpperCase().includes('GROMMET')
  );

  const label = `Superficie Giro ${angleDeg}° Mila`;

  async function handleGrommetChange(e) {
    const nextVal = e.target.value === 'si';
    if (nextVal === isGrommet) return;
    if (!api?.swapMilaGiroGrommet) return;

    await api.swapMilaGiroGrommet(instanceId, nextVal);
    onClose?.();
  }

  return (
    <div style={sectionStyle}>
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#111827' }}>
        {label}
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Grommet</label>
        <select
          value={isGrommet ? 'si' : 'no'}
          onChange={handleGrommetChange}
          style={{
            width: '100%',
            padding: '7px 8px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: '#fff',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <option value="no">No</option>
          <option value="si">Si</option>
        </select>
      </div>
    </div>
  );
}

export default function MilaProperties({ part, api, onClose }) {
  if (!isMilaEditablePart(part)) return null;

  const currentSeat =
    part?.currentSeat ||
    (part.seats && part.seats[part.clickedSeatIndex || 0]) || {
      instanceId: part.instanceId,
      code: part.code,
      seatMode:
        part?.meta?.seatMode ||
        (String(part?.code || '').includes('165000') ? 'table' : 'chair'),
      label: 'Silla 1',
    };

  const currentMode = resolveMilaModeFromPart(currentSeat);
  const seatLabel = currentSeat.label || `Silla ${(Number(part?.clickedSeatIndex ?? 0)) + 1}`;

  async function handleModeChange(e) {
    const targetMode = e.target.value;
    if (targetMode === currentMode) return;
    if (!api?.swapMilaSeatVariant || !currentSeat.instanceId) return;

    await api.swapMilaSeatVariant(currentSeat.instanceId, currentSeat.code, targetMode);
    onClose?.();
  }

  return (
    <div style={sectionStyle}>
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#111827' }}>
        {seatLabel}
      </div>
      <select
        value={currentMode}
        onChange={handleModeChange}
        style={{
          width: '100%',
          padding: '7px 8px',
          borderRadius: 8,
          border: '1px solid #d1d5db',
          background: '#fff',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        <option value="chair">Silla</option>
        <option value="table">Mesa</option>
        <option value="tableGrommet">Mesa con grommet</option>
      </select>
    </div>
  );
}
