import { sectionStyle } from './shared/PropertyStyles';

function normalizeLine(part) {
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

function normalizeRole(part) {
  return String(
    part?.role ||
    part?.meta?.role ||
    part?.userData?.role ||
    part?.userData?.meta?.role ||
    ''
  )
    .trim()
    .toLowerCase();
}

function normalizeCode(part) {
  return String(part?.code || part?.codigoPT || '').trim().toUpperCase();
}

function isMilaGiroByCode(code) {
  if (!code) return false;
  if (code.startsWith('TKSSU') && !code.includes('165000')) return true;
  return [
    '22000127783',
    '22000127784',
    '22000127785',
    '22000127786',
    '22000127787',
    '22000127788',
    '22000127789',
    '22000127790',
  ].includes(code);
}

export function isGiroSurfaceEditablePart(part) {
  if (!part) return false;

  const kind = String(part?.kind || '').toUpperCase();
  const type = String(part?.type || '').toUpperCase();
  const role = normalizeRole(part);
  const line = normalizeLine(part);
  const code = normalizeCode(part);

  if (kind === 'MOREA_GIRO_SURFACE' || type === 'MOREA_GIRO_SURFACE') return true;
  if (kind === 'MILA_GIRO_SURFACE' || type === 'MILA_GIRO_SURFACE') return true;

  if (role !== 'giro-surface') return false;
  if (line === 'MOREA') return true;
  if (line === 'MILA' || line === 'MILA_DOUBLE') return true;

  return isMilaGiroByCode(code);
}

function resolveGiroLine(part) {
  const line = normalizeLine(part);
  const kind = String(part?.kind || '').toUpperCase();
  const type = String(part?.type || '').toUpperCase();
  const code = normalizeCode(part);

  if (kind === 'MOREA_GIRO_SURFACE' || type === 'MOREA_GIRO_SURFACE' || line === 'MOREA') {
    return 'MOREA';
  }

  if (
    kind === 'MILA_GIRO_SURFACE' ||
    type === 'MILA_GIRO_SURFACE' ||
    line === 'MILA' ||
    line === 'MILA_DOUBLE' ||
    isMilaGiroByCode(code)
  ) {
    return 'MILA';
  }

  return null;
}

function resolveBaseAndGrommetCode(part) {
  const code = normalizeCode(part);
  if (!code) return { baseCode: '', grommetCode: '' };
  const baseCode = code.endsWith('_GROMMET') ? code.slice(0, -8) : code;
  return {
    baseCode,
    grommetCode: `${baseCode}_GROMMET`,
  };
}

export default function GiroSurfaceProperties({ part, api, onClose }) {
  if (!isGiroSurfaceEditablePart(part)) return null;

  const line = resolveGiroLine(part);
  const instanceId = part?.instanceId || part?.userData?.instanceId || part?.uuid;
  const angleDeg = Number(
    part?.angleDeg || part?.meta?.angleDeg || part?.userData?.meta?.angleDeg || part?.userData?.angleDeg || 60
  );
  const code = normalizeCode(part);
  const isGrommet =
    Boolean(part?.useGrommet ?? part?.meta?.useGrommet ?? part?.userData?.meta?.useGrommet) ||
    code.endsWith('_GROMMET');
  const { baseCode, grommetCode } = resolveBaseAndGrommetCode(part);

  const lineLabel = line === 'MOREA' ? 'Morea' : 'Mila';

  async function handleGrommetChange(e) {
    const nextVal = e.target.value === 'si';
    if (nextVal === isGrommet) return;
    if (!instanceId) return;

    if (line === 'MOREA') {
      if (!api?.swapMoreaGiroGrommet) return;
      await api.swapMoreaGiroGrommet(instanceId, nextVal);
      onClose?.();
      return;
    }

    if (line === 'MILA') {
      if (!api?.swapMilaGiroGrommet) return;
      await api.swapMilaGiroGrommet(instanceId, nextVal);
      onClose?.();
    }
  }

  return (
    <div style={sectionStyle}>
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#111827' }}>
        Superficie giro {angleDeg}° {lineLabel}
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

      <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>
        Codigo base: {baseCode || '-'}
      </div>
      <div style={{ marginTop: 2, fontSize: 11, color: '#6b7280' }}>
        Codigo grommet: {grommetCode || '-'}
      </div>
    </div>
  );
}
