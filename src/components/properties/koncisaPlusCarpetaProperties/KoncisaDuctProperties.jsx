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

  const ceilingDucts =
    part?.ceilingDucts ||
    part?.meta?.ceilingDucts ||
    (tipoModulo === 'INTERMEDIO' ? { left: false, right: false } : { single: false });

  //const tipoModulo = String(part?.meta?.tipoModulo || '').toUpperCase();
  const isTerminal = tipoModulo === 'TERMINAL';
  const currentRotY = Number(part?.transformMm?.rotY || 0);

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

      {tipoModulo === 'TERMINAL' && (
        <button
          type="button"
          onClick={() => {
            api?.rotateSelectedDuct180?.();
          }}
          style={{
            width: '100%',
            marginTop: 14,
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #ccc',
            background: '#f5f5f5',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Rotar ducto 180°
        </button>
      )}

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

      {tipoModulo !== 'INDIVIDUAL' && (
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Ducto bajante a techo</label>

          {tipoModulo === 'INTERMEDIO' ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={!!ceilingDucts.left}
                  disabled={!!ceilingDucts.right}
                  onChange={(e) =>
                    api?.updateSelectedCeilingDucts?.({ left: e.target.checked })
                  }
                />
                Bajante lado izquierdo
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={!!ceilingDucts.right}
                  disabled={!!ceilingDucts.left}
                  onChange={(e) =>
                    api?.updateSelectedCeilingDucts?.({ right: e.target.checked })
                  }
                />
                Bajante lado derecho
              </label>
            </div>
          ) : (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={!!ceilingDucts.single}
                onChange={(e) =>
                  api?.updateSelectedCeilingDucts?.({ single: e.target.checked })
                }
              />
              Incluir en el extremo abierto
            </label>
          )}
        </div>
      )}
    </div>
  );
}
