import { sectionStyle, labelStyle, inputStyle } from '../shared/PropertyStyles.js';

export default function LinkPantallaProperties({ part, config, onChange, api, disabled }) {
  const isFrontal = part.componentRole === 'PANTALLA_FRONTAL_BOARD';
  const isFalda = part.componentRole === 'PANTALLA_FALDA_BOARD';
  return (
    <div style={sectionStyle}>
      {!isFalda && (
        <label style={labelStyle}>
          Alto de pantalla
          <select
            style={inputStyle}
            disabled={disabled}
            value={config?.heightMm ?? 300}
            onChange={(e) => onChange?.({ heightMm: Number(e.target.value) })}
          >
            <option value={300}>30 cm</option>
            <option value={500}>50 cm</option>
          </select>
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (isFalda) {
            api?.updateSelectedLink?.({ ...part.config, hasPantallaFalda: false });
          } else if (isFrontal) {
            api?.updateSelectedLink?.({ ...part.config, hasPantallaFrontal: false });
          } else {
            api?.updateSelectedLink?.({ ...part.config, hasPantallaLateral: false });
          }
        }}
      >
        Eliminar {isFalda ? 'falda pantalla' : `pantalla ${isFrontal ? 'frontal' : 'lateral'}`}
      </button>
    </div>
  );
}
