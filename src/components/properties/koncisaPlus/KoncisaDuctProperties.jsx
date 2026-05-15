import { inputStyle, labelStyle, sectionStyle } from '../shared/PropertyStyles';

function normalizeTipoModulo(value) {
  return String(value || 'TERMINAL')
    .trim()
    .toUpperCase();
}

export default function KoncisaDuctProperties({ part, api }) {
  const tipoModulo = normalizeTipoModulo(part?.meta?.tipoModulo);

  const ductCovers =
    part?.ductCovers ||
    part?.meta?.ductCovers ||
    (tipoModulo === 'INTERMEDIO' ? { left: false, right: false } : { single: false });

  return (
    <div style={sectionStyle}>
      <label style={labelStyle}>Tipo de ducto</label>

      <select
        value={tipoModulo}
        onChange={(e) => api?.updateSelectedDuctType?.(e.target.value)} // Asegúrate que esta función se ejecute
        style={inputStyle}
      >
        <option value="TERMINAL">Terminal</option>
        <option value="INTERMEDIO">Intermedio</option>
        <option value="INDIVIDUAL">Individual</option>
      </select>

      <div style={{ marginTop: 14 }}>
        <label style={labelStyle}>Tapas ducto</label>

        {tipoModulo === 'INTERMEDIO' ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={!!ductCovers.left}
                onChange={(e) =>
                  api?.updateSelectedDuctCovers?.({
                    left: e.target.checked,
                  })
                }
              />
              Tapa lado izquierdo
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={!!ductCovers.right}
                onChange={(e) =>
                  api?.updateSelectedDuctCovers?.({
                    right: e.target.checked,
                  })
                }
              />
              Tapa lado derecho
            </label>
          </div>
        ) : (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={!!ductCovers.single}
              onChange={(e) =>
                api?.updateSelectedDuctCovers?.({
                  single: e.target.checked,
                })
              }
            />
            Incluir tapa ducto
          </label>
        )}
      </div>
    </div>
  );
}
