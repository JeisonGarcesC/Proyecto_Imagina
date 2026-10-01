// src/components/KuoAVPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Panel izquierdo para la línea "Kuo Altura Variable".
// Formulario unificado (mismo patrón UX que Koncisa Plus): se configura el
// producto completo (tipo de puesto, dimensiones, acabados, pantalla, etc.)
// y se crea con un único botón "Crear puesto".
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';

const ANCHOS_MM = [1200, 1500, 1650];
const PROFUNDIDADES_MM = [600, 750];
const ESPESORES_MM = [18, 25, 30];

const PANTALLA_TIPOS = [
  { value: 'FORMICA', label: 'Formica' },
  { value: 'MELAMINA', label: 'Melamina' },
  { value: 'TELA', label: 'Tela / Acústica' },
  { value: 'VIDRIO', label: 'Vidrio Laminado' },
  { value: 'FRONTAL_PERIMETRAL', label: 'Frontal Perimetral (Vidrio 4+4)' },
];

const boxStyle = {
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: 10,
  background: '#fff',
  display: 'grid',
  gap: 8,
};

const fieldLabelStyle = { fontSize: 12, fontWeight: 600, color: '#333' };
const selectStyle = { width: '100%' };

export default function KuoAVPanel({ threeApiRef }) {
  const [creating, setCreating] = useState(false);

  // Tipo de puesto: sencillo (perimetral) o doble (cara a cara)
  const [tipoPuesto, setTipoPuesto] = useState('sencillo');

  // Dimensiones y acabado compartidos
  const [anchoMm, setAnchoMm] = useState(1200);
  const [profundidadMm, setProfundidadMm] = useState(600);
  const [thickMm, setThickMm] = useState(30);
  const [espesorTipo, setEspesorTipo] = useState('Formica 30');
  const [especial, setEspecial] = useState(false);

  // Kit fuente / accesorios eléctricos
  const [kitFuente, setKitFuente] = useState(true);
  const [kitFuenteColor, setKitFuenteColor] = useState('Blanco');
  const [elevarKitFIzquierdo, setElevarKitFIzquierdo] = useState(false);

  // Vertebra / grommet (solo puesto sencillo)
  const [vertebraLateral, setVertebraLateral] = useState(false);
  const [acabadoGrommet, setAcabadoGrommet] = useState('ALUMINIUM');

  // Puesto doble - opciones adicionales existentes en KuoAVDobleBuilder
  const [baldosaFormica, setBaldosaFormica] = useState(false);
  const [costadoIntermedio, setCostadoIntermedio] = useState(false);
  const [vertebraLeftEnabled, setVertebraLeftEnabled] = useState(true);
  const [vertebraRightEnabled, setVertebraRightEnabled] = useState(true);

  // Número de puestos a crear y unir en una sola bancada continua (igual que
  // el selector "Puestos" de Koncisa Plus).
  const [numPuestos, setNumPuestos] = useState(1);

  // Pantalla (integrada al mismo ensamble, igual que Koncisa Plus).
  // El acabado se resuelve por el material del catálogo (no es un color libre).
  const [includePantalla, setIncludePantalla] = useState(false);
  const [pantallaTipo, setPantallaTipo] = useState('FORMICA');
  const [pantallaPosicion, setPantallaPosicion] = useState('CENTRAL');

  const isDoble = tipoPuesto === 'doble';

  // Frontal Perimetral solo tiene soporte físico como pantalla independiente en
  // puesto sencillo perimetral; en puesto doble el builder soporta Formica/Melamina/Tela/Vidrio.
  const pantallaTipoOptions = useMemo(() => {
    if (isDoble) {
      return PANTALLA_TIPOS.filter((opt) => opt.value !== 'FRONTAL_PERIMETRAL');
    }
    return PANTALLA_TIPOS;
  }, [isDoble]);

  function buildSharedConfig() {
    return {
      anchoMm: Number(anchoMm),
      profundidadMm: Number(profundidadMm),
      alturaMm: 730,
      thickMm: Number(thickMm),
      espesorTipo,
      kitFuente,
      kitFuenteColor,
      elevarKitFIzquierdo,
      acabadoGrommet,
      especial,
      pantalla: includePantalla,
      pantallaEnabled: includePantalla,
      pantallaTipo,
    };
  }

  async function handleCreate() {
    const api = threeApiRef?.current;
    setCreating(true);
    try {
      const count = Math.max(1, Number(numPuestos) || 1);
      // Ancho real en metros que ocupa cada puesto para unirlos borde-a-borde
      // (sin huecos), igual que la bancada continua de Koncisa Plus.
      const stepM = Number(anchoMm) / 1000;
      // Punto de partida real: borde derecho de lo que ya exista en la
      // escena (incluyendo puestos del otro tipo), para nunca superponer
      // un puesto doble sobre uno sencillo (o viceversa).
      const baseOffsetM =
        typeof api?.getNextKuoAVOffsetX === 'function' ? api.getNextKuoAVOffsetX() : 0;

      if (isDoble) {
        if (!api?.addKuoAVDoble) {
          console.warn('[KuoAVPanel] threeApiRef.current.addKuoAVDoble no está disponible.');
          return;
        }
        for (let i = 0; i < count; i += 1) {
          await api.addKuoAVDoble({
            ...buildSharedConfig(),
            baldosaFormica,
            costadoIntermedio,
            vertebraLeftEnabled,
            vertebraRightEnabled,
            pantallaPosicion,
            position: [baseOffsetM + i * stepM, 0, 0],
          });
        }
      } else {
        if (!api?.addKuoAV) {
          console.warn('[KuoAVPanel] threeApiRef.current.addKuoAV no está disponible.');
          return;
        }
        for (let i = 0; i < count; i += 1) {
          await api.addKuoAV({
            ...buildSharedConfig(),
            vertebraLateral,
            position: [baseOffsetM + i * stepM, 0, 0],
          });
        }
      }
    } catch (err) {
      console.error('[KuoAVPanel] Error al crear puesto Kuo AV:', err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>Kuo Altura Variable</div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
          Configura el puesto y créalo con sus partes y BOM completos
        </div>
      </div>

      <div>
        <label style={fieldLabelStyle}>Tipo de puesto</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => setTipoPuesto('sencillo')}
            aria-pressed={tipoPuesto === 'sencillo'}
            style={{
              padding: '8px 6px',
              borderRadius: 8,
              border: '1px solid #dfdfdf',
              fontWeight: tipoPuesto === 'sencillo' ? 700 : 400,
              background: tipoPuesto === 'sencillo' ? '#eef2ff' : '#fff',
              cursor: 'pointer',
            }}
          >
            1 Puesto (Perimetral)
          </button>
          <button
            type="button"
            onClick={() => setTipoPuesto('doble')}
            aria-pressed={tipoPuesto === 'doble'}
            style={{
              padding: '8px 6px',
              borderRadius: 8,
              border: '1px solid #dfdfdf',
              fontWeight: tipoPuesto === 'doble' ? 700 : 400,
              background: tipoPuesto === 'doble' ? '#eef2ff' : '#fff',
              cursor: 'pointer',
            }}
          >
            2 Puestos (Doble)
          </button>
        </div>
      </div>

      <div>
        <label style={fieldLabelStyle}>Número de puestos a crear (se unen sin espacio)</label>
        <select value={numPuestos} onChange={(e) => setNumPuestos(Number(e.target.value))} style={selectStyle}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'puesto' : 'puestos'}
            </option>
          ))}
        </select>
      </div>

      <div style={boxStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={fieldLabelStyle}>Ancho</label>
            <select value={anchoMm} onChange={(e) => setAnchoMm(Number(e.target.value))} style={selectStyle}>
              {ANCHOS_MM.map((v) => (
                <option key={v} value={v}>
                  {v} mm
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={fieldLabelStyle}>Profundidad</label>
            <select
              value={profundidadMm}
              onChange={(e) => setProfundidadMm(Number(e.target.value))}
              style={selectStyle}
            >
              {PROFUNDIDADES_MM.map((v) => (
                <option key={v} value={v}>
                  {v} mm
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={fieldLabelStyle}>Espesor superficie</label>
            <select
              value={thickMm}
              onChange={(e) => {
                const v = Number(e.target.value);
                setThickMm(v);
                setEspesorTipo(`Formica ${v}`);
              }}
              style={selectStyle}
            >
              {ESPESORES_MM.map((v) => (
                <option key={v} value={v}>
                  {v} mm
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={fieldLabelStyle}>Acabado grommet</label>
            <select value={acabadoGrommet} onChange={(e) => setAcabadoGrommet(e.target.value)} style={selectStyle}>
              <option value="ALUMINIUM">Aluminio</option>
              <option value="Anodizado">Anodizado</option>
              <option value="NONE">Sin grommet</option>
            </select>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <input type="checkbox" checked={especial} onChange={(e) => setEspecial(e.target.checked)} />
          Modo especial (medida no estándar)
        </label>
      </div>

      <div style={boxStyle}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
          <input type="checkbox" checked={kitFuente} onChange={(e) => setKitFuente(e.target.checked)} />
          Incluir kit fuente de alimentación (columnas motorizadas)
        </label>

        {kitFuente && (
          <>
            <div>
              <label style={fieldLabelStyle}>Color kit fuente</label>
              <select value={kitFuenteColor} onChange={(e) => setKitFuenteColor(e.target.value)} style={selectStyle}>
                <option value="Blanco">Blanco</option>
                <option value="Negro">Negro</option>
                <option value="Gris">Gris</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={elevarKitFIzquierdo}
                onChange={(e) => setElevarKitFIzquierdo(e.target.checked)}
              />
              Elevar kit fuente izquierdo
            </label>
          </>
        )}
      </div>

      {!isDoble && (
        <div style={boxStyle}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <input type="checkbox" checked={vertebraLateral} onChange={(e) => setVertebraLateral(e.target.checked)} />
            Vértebra lateral (en vez de central)
          </label>
        </div>
      )}

      {isDoble && (
        <div style={boxStyle}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Opciones puesto doble</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={baldosaFormica}
              onChange={(e) => setBaldosaFormica(e.target.checked)}
            />
            Baldosa divisoria central Formica
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={costadoIntermedio}
              onChange={(e) => setCostadoIntermedio(e.target.checked)}
            />
            Costado intermedio
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={vertebraLeftEnabled}
              onChange={(e) => setVertebraLeftEnabled(e.target.checked)}
            />
            Vértebra puesto izquierdo
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={vertebraRightEnabled}
              onChange={(e) => setVertebraRightEnabled(e.target.checked)}
            />
            Vértebra puesto derecho
          </label>
        </div>
      )}

      <div style={boxStyle}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
          <input
            type="checkbox"
            checked={includePantalla}
            onChange={(e) => setIncludePantalla(e.target.checked)}
          />
          Incluir pantalla
        </label>

        {includePantalla && (
          <>
            <div>
              <label style={fieldLabelStyle}>Material de pantalla</label>
              <select
                value={pantallaTipo}
                onChange={(e) => setPantallaTipo(e.target.value)}
                style={selectStyle}
              >
                {pantallaTipoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {isDoble && (
              <div>
                <label style={fieldLabelStyle}>Ubicación de pantalla</label>
                <select
                  value={pantallaPosicion}
                  onChange={(e) => setPantallaPosicion(e.target.value)}
                  style={selectStyle}
                >
                  <option value="CENTRAL">Central</option>
                  <option value="POSTERIOR">Posterior</option>
                  <option value="FRONTAL">Frontal</option>
                </select>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ fontSize: 12, opacity: 0.8, background: '#f8f8f8', borderRadius: 8, padding: 8 }}>
        <div>Tipo: {isDoble ? 'Puesto Doble (cara a cara)' : 'Puesto Sencillo (Perimetral)'}</div>
        <div>
          Dimensión: {anchoMm} x {profundidadMm} mm, espesor {thickMm} mm
        </div>
        <div>Puestos a crear: {numPuestos} (unidos borde a borde)</div>
        <div>Kit fuente: {kitFuente ? `Sí (${kitFuenteColor})` : 'No'}</div>
        <div>
          Pantalla:{' '}
          {includePantalla
            ? `${pantallaTipoOptions.find((o) => o.value === pantallaTipo)?.label || pantallaTipo}${
                isDoble ? ` - ${pantallaPosicion}` : ''
              }`
            : 'No incluida'}
        </div>
      </div>

      <button
        type="button"
        disabled={creating}
        onClick={handleCreate}
        style={{
          padding: '12px',
          borderRadius: 10,
          border: 'none',
          background: creating ? '#9ca3af' : '#1a56db',
          color: '#fff',
          fontWeight: 800,
          fontSize: 13,
          cursor: creating ? 'not-allowed' : 'pointer',
        }}
      >
        {creating ? 'Creando…' : numPuestos > 1 ? `Crear ${numPuestos} puestos` : 'Crear puesto'}
      </button>
    </div>
  );
}
