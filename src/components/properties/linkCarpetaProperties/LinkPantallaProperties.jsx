import { sectionStyle, labelStyle } from '../shared/PropertyStyles.js';

export default function LinkPantallaProperties({ part, api, disabled }) {
  const isFrontal = part.componentRole === 'PANTALLA_FRONTAL_BOARD';
  return (
    <div style={sectionStyle}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (isFrontal) {
            api?.updateSelectedLink?.({ ...part.config, hasPantallaFrontal: false });
          } else {
            api?.updateSelectedLink?.({ ...part.config, hasPantallaLateral: false });
          }
        }}
      >
        Eliminar pantalla {isFrontal ? 'frontal' : 'lateral'}
      </button>
    </div>
  );
}
