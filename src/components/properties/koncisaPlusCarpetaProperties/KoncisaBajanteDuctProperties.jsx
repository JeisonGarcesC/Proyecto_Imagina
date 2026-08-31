import { sectionStyle } from '../shared/PropertyStyles';

export default function KoncisaBajanteDuctProperties({ part, api, isFloorDuct, isCeilingDuct }) {
  return (
    <div style={sectionStyle}>
      <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>
        {isFloorDuct ? 'Ducto bajante a piso' : 'Ducto bajante a techo'}
      </div>

      <div style={{ fontSize: 11, opacity: 0.75, display: 'grid', gap: 3 }}>
        <div>
          <b>Modelo:</b> {part?.meta?.modelCode || 'No definido'}
        </div>

        <div>
          <b>Referencia:</b>{' '}
          {part?.meta?.referenceDuctType ||
            part?.meta?.tipoModuloReferencia ||
            part?.meta?.referenceDuctCode ||
            'No definida'}
        </div>

        {part?.meta?.tipoPuesto && (
          <div>
            <b>Tipo puesto:</b> {part.meta.tipoPuesto}
          </div>
        )}

        {part?.meta?.tipoPasoCable && (
          <div>
            <b>Cableado:</b> {part.meta.tipoPasoCable}
          </div>
        )}

        {part?.meta?.side && (
          <div>
            <b>Lado actual:</b> {part.meta.side === 'RIGHT' ? 'Derecha' : 'Izquierda'}
          </div>
        )}
      </div>

      {isCeilingDuct && (
        <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65 }}>
          Este bajante depende del ducto horizontal. Para incluirlo, quitarlo o cambiar su extremo,
          selecciona el ducto asociado.
        </div>
      )}

      {isFloorDuct && (
        <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65 }}>
          Este ducto bajante a piso se ubica automáticamente según la regla del puesto y el ducto de
          referencia.
        </div>
      )}
    </div>
  );
}
