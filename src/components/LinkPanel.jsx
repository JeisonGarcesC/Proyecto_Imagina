// src/components/LinkPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Panel izquierdo del producto Link (credenza).
// UI: un solo botón con imagen para insertar el producto por defecto.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { CardImage, IMAGE_FOLDER_SETS } from './LeftPanel';

export default function LinkPanel({ threeApiRef }) {
  const [inserting, setInserting] = useState(false);

  // Configuración inicial por defecto al insertar
  const defaultTipoKey = '2_archivos';
  const defaultEntrega = 'DER';
  const defaultAncho = 120;

  async function handleInsert() {
    const api = threeApiRef?.current;
    if (!api?.addLink) {
      console.warn('[LinkPanel] threeApiRef.current.addLink no está disponible.');
      return;
    }
    setInserting(true);
    try {
      await api.addLink({ 
        tipoKey: defaultTipoKey, 
        entrega: defaultEntrega, 
        ancho: defaultAncho 
      });
    } catch (err) {
      console.error('[LinkPanel] Error al insertar Link:', err);
    } finally {
      setInserting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
      {/* ── Título ─────────────────────────────────────────────────────── */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>Link</div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
          Credenza modular
        </div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>
        Selecciona un producto para agregarlo al proyecto.
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <button
          type="button"
          disabled={inserting}
          onClick={handleInsert}
          title="Credenza EXE"
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
          <div style={{ width: '100%' }}>
            <CardImage
              assetName="Credenza EXE"
              title="Credenza EXE"
              imageFolders={IMAGE_FOLDER_SETS.link}
              imageFit="contain"
              imageHeight={120}
              imagePadding={8}
              imageBackground="#ffffff"
            />
          </div>
          <div style={{ fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word', fontSize: 13 }}>
            Credenza EXE
          </div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.85,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            Credenza modular Link
          </div>
        </button>
      </div>
    </div>
  );
}
