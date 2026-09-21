import { sectionStyle } from '../shared/PropertyStyles';

export default function KoncisaPrivacyPanelProperties({ part, api, onClose }) {
  const isLateral =
    part?.kind === 'PRIVACY_PANEL' &&
    (String(part?.subtype || '').toLowerCase() === 'lateral' ||
      String(part?.description || part?.name || '').toUpperCase().includes('PANTALLA LATERAL'));
  if (!isLateral) return null;

  return (
    <div style={sectionStyle}>
      <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Posición (pasos de 50 mm)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button type="button" onClick={() => api?.moveActiveKoncisaLateralPanel?.('LEFT')}>
              Mover izquierda
            </button>
            <button type="button" onClick={() => api?.moveActiveKoncisaLateralPanel?.('RIGHT')}>
              Mover derecha
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              if (api?.removeActiveKoncisaLateralPanel?.()) onClose?.();
            }}
          >
            Eliminar pantalla
          </button>
      </div>
    </div>
  );
}
