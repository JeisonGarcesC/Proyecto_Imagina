// src/components/KuoAVPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Panel izquierdo para la línea "Kuo Altura Variable".
// Permite seleccionar e insertar el producto "KUO AV - Perimetral".
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';

export default function KuoAVPanel({ threeApiRef }) {
  const [inserting, setInserting] = useState(false);

  // Configuración base oficial solicitada para validación completa
  const baseConfig = {
    anchoMm: 1200,
    profundidadMm: 600,
    alturaMm: 730,
    thickMm: 30,
    kitFuente: true,
    vertebraEnabled: true,
    vertebraLateral: true,
    acabadoGrommet: 'ALUMINIUM',
  };

  const baseDobleConfig = {
    anchoMm: 1200,
    profundidadMm: 600,
    alturaMm: 730,
    thickMm: 30,
    espesorTipo: 'Formica 30',
    kitFuenteColor: 'Blanco',
    kitFuente: true,
    elevarKitFIzquierdo: false,
    acabadoGrommet: 'Anodizado',
    especial: false,
    baldosaFormica: false,
    costadoIntermedio: true,
    vertebraLeftEnabled: true,
    vertebraRightEnabled: true,
  };

  async function handleInsert() {
    const api = threeApiRef?.current;
    if (!api?.addKuoAV) {
      console.warn('[KuoAVPanel] threeApiRef.current.addKuoAV no está disponible.');
      return;
    }
    setInserting(true);
    try {
      await api.addKuoAV(baseConfig);
    } catch (err) {
      console.error('[KuoAVPanel] Error al insertar KUO AV:', err);
    } finally {
      setInserting(false);
    }
  }

  async function handleInsertDoble() {
    const api = threeApiRef?.current;
    if (!api?.addKuoAVDoble) {
      console.warn('[KuoAVPanel] threeApiRef.current.addKuoAVDoble no está disponible.');
      return;
    }
    setInserting(true);
    try {
      await api.addKuoAVDoble(baseDobleConfig);
    } catch (err) {
      console.error('[KuoAVPanel] Error al insertar KUO AV Puesto Doble:', err);
    } finally {
      setInserting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>Kuo Altura Variable</div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
          Línea de mesas ajustables en altura
        </div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>
        Selecciona un producto para agregarlo al proyecto.
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {/* KUO AV - Perimetral */}
        <button
          type="button"
          disabled={inserting}
          onClick={handleInsert}
          title="KUO AV - Perimetral"
          style={{
            textAlign: 'left',
            padding: '12px',
            borderRadius: 12,
            border: '1px solid #dfdfdf',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%)',
            width: '100%',
            cursor: inserting ? 'not-allowed' : 'pointer',
            opacity: inserting ? 0.6 : 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              width: '100%',
              height: 120,
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#4b5563' }}>KUO AV</span>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>Superficie Perimetral</div>
            </div>
          </div>
          <div style={{ fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word', fontSize: 13 }}>
            KUO AV - Perimetral
          </div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.85,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            Mesa ajustable en altura con superficie perimetral paramétrica
          </div>
        </button>

        {/* KUO AV - Puesto Doble */}
        <button
          type="button"
          disabled={inserting}
          onClick={handleInsertDoble}
          title="KUO AV - Puesto Doble"
          style={{
            textAlign: 'left',
            padding: '12px',
            borderRadius: 12,
            border: '1px solid #dfdfdf',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%)',
            width: '100%',
            cursor: inserting ? 'not-allowed' : 'pointer',
            opacity: inserting ? 0.6 : 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              width: '100%',
              height: 120,
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#1e40af' }}>KUO AV</span>
              <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 2, fontWeight: 700 }}>PUESTO DOBLE</div>
            </div>
          </div>
          <div style={{ fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word', fontSize: 13 }}>
            KUO AV - Puesto Doble
          </div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.85,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            Estación de trabajo doble cara a cara con espina central y variantes de ancho
          </div>
        </button>

        {/* Pantalla Formica / Melamina / Tela */}
        <button
          type="button"
          disabled={inserting}
          onClick={async () => {
            const api = threeApiRef?.current;
            if (!api?.addKuoAVPantalla) {
              console.warn('[KuoAVPanel] addKuoAVPantalla no disponible');
              return;
            }
            setInserting(true);
            try {
              await api.addKuoAVPantalla({
                anchoMm: 1200,
                tipo: 'FORMICA',
                acabado: '#dedede',
              });
            } catch (err) {
              console.error('[KuoAVPanel] Error al agregar Pantalla Formica / Melamina / Tela:', err);
            } finally {
              setInserting(false);
            }
          }}
          title="Pantalla Formica / Melamina / Tela"
          style={{
            textAlign: 'left',
            padding: '12px',
            borderRadius: 12,
            border: '1px solid #dfdfdf',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%)',
            width: '100%',
            cursor: inserting ? 'not-allowed' : 'pointer',
            opacity: inserting ? 0.6 : 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              width: '100%',
              height: 120,
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: '1px solid #fcd34d',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#92400e' }}>PANTALLA</span>
              <div style={{ fontSize: 10, color: '#b45309', marginTop: 2, fontWeight: 700 }}>
                FORMICA / MELAMINA / TELA
              </div>
            </div>
          </div>
          <div style={{ fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word', fontSize: 13 }}>
            Pantalla Formica / Melamina / Tela
          </div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.85,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            Pantalla divisoria central con soportes KUAC690000 / KUAC700000 / KUAC670000
          </div>
        </button>

        {/* Pantalla Vidrio */}
        <button
          type="button"
          disabled={inserting}
          onClick={async () => {
            const api = threeApiRef?.current;
            if (!api?.addKuoAVPantalla) {
              console.warn('[KuoAVPanel] addKuoAVPantalla no disponible');
              return;
            }
            setInserting(true);
            try {
              await api.addKuoAVPantalla({
                anchoMm: 1200,
                tipo: 'VIDRIO',
                acabado: '#a5f3fc',
              });
            } catch (err) {
              console.error('[KuoAVPanel] Error al agregar Pantalla Vidrio:', err);
            } finally {
              setInserting(false);
            }
          }}
          title="Pantalla Vidrio"
          style={{
            textAlign: 'left',
            padding: '12px',
            borderRadius: 12,
            border: '1px solid #bae6fd',
            background: 'linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)',
            width: '100%',
            cursor: inserting ? 'not-allowed' : 'pointer',
            opacity: inserting ? 0.6 : 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              width: '100%',
              height: 120,
              background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: '1px solid #7dd3fc',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#0369a1' }}>VIDRIO</span>
              <div style={{ fontSize: 10, color: '#0284c7', marginTop: 2, fontWeight: 700 }}>
                VIDRIO LAMINADO KUAC660000
              </div>
            </div>
          </div>
          <div style={{ fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word', fontSize: 13, color: '#0369a1' }}>
            Pantalla Vidrio
          </div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.85,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            Pantalla frontal en vidrio laminado traslúcido 4+4 altura variable KUAC660000
          </div>
        </button>

        {/* Pantalla Frontal Perimetral (KUAC710000) */}
        <button
          type="button"
          disabled={inserting}
          onClick={async () => {
            const api = threeApiRef?.current;
            if (!api?.addKuoAVPantalla) {
              console.warn('[KuoAVPanel] addKuoAVPantalla no disponible');
              return;
            }
            setInserting(true);
            try {
              await api.addKuoAVPantalla({
                anchoMm: 1200,
                tipo: 'FRONTAL_PERIMETRAL',
                acabado: '#a5f3fc',
              });
            } catch (err) {
              console.error('[KuoAVPanel] Error al agregar Pantalla Frontal Perimetral:', err);
            } finally {
              setInserting(false);
            }
          }}
          title="Pantalla Frontal Perimetral"
          style={{
            textAlign: 'left',
            padding: '12px',
            borderRadius: 12,
            border: '1px solid #a7f3d0',
            background: 'linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)',
            width: '100%',
            cursor: inserting ? 'not-allowed' : 'pointer',
            opacity: inserting ? 0.6 : 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              width: '100%',
              height: 120,
              background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: '1px solid #6ee7b7',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#065f46' }}>PERIMETRAL</span>
              <div style={{ fontSize: 10, color: '#047857', marginTop: 2, fontWeight: 700 }}>
                VIDRIO LAMINADO KUAC710000
              </div>
            </div>
          </div>
          <div style={{ fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word', fontSize: 13, color: '#065f46' }}>
            Pantalla Frontal Perimetral
          </div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.85,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            Pantalla frontal para puesto individual y doble con soporte para tomas KUAC710000
          </div>
        </button>
      </div>
    </div>
  );
}
