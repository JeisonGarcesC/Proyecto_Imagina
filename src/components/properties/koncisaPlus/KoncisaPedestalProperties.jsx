import { dangerBtnStyle, sectionStyle } from '../shared/PropertyStyles';

export default function KoncisaPedestalProperties({ part, api, onClose }) {
  return (
    <div style={sectionStyle}>
      <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>Pedestal Koncisa Plus</div>

      <div style={{ fontSize: 11, opacity: 0.75, display: 'grid', gap: 3 }}>
        <div>
          <b>Modelo:</b> {part?.meta?.modelCode || 'KONPLUSSPYMPED'}
        </div>

        <div>
          <b>Reemplaza:</b> {part?.meta?.replaceZone || 'Costado'}
        </div>

        <div>
          <b>Lado:</b> {part?.meta?.placementSide === 'LEFT' ? 'Izquierda' : 'Derecha'}
        </div>
      </div>

      <button
        type="button"
        style={dangerBtnStyle}
        onClick={() => {
          api?.replaceSelectedPedestalWithCostado?.();
          onClose?.();
        }}
      >
        Volver a costado
      </button>

      <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>
        Esta acción elimina el pedestal y restaura el costado original.
      </div>
    </div>
  );
}
