import { btnStyle, labelStyle, sectionStyle } from '../shared/PropertyStyles';

export default function KoncisaCostadoProperties({ part, api, onClose }) {
  return (
    <div style={sectionStyle}>
      <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>Costado Koncisa Plus</div>

      <div style={{ fontSize: 11, opacity: 0.75, display: 'grid', gap: 3 }}>
        <div>
          <b>Zona:</b> {part?.meta?.replaceZone || part?.meta?.side || 'No definida'}
        </div>

        <div>
          <b>Módulo:</b> {part?.meta?.moduleIndex ?? 'No definido'}
        </div>

        <div>
          <b>Replace key:</b> {part?.meta?.replaceKey || 'No definido'}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <label style={labelStyle}>Reemplazar por pedestal</label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            type="button"
            style={btnStyle}
            onClick={() => {
              api?.replaceSelectedCostadoWithPedestal?.({
                placementSide: 'LEFT',
              });
              onClose?.();
            }}
          >
            Izquierda
          </button>

          <button
            type="button"
            style={btnStyle}
            onClick={() => {
              api?.replaceSelectedCostadoWithPedestal?.({
                placementSide: 'RIGHT',
              });
              onClose?.();
            }}
          >
            Derecha
          </button>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>
        Esta acción elimina este costado y crea un pedestal en su lugar.
      </div>
    </div>
  );
}
