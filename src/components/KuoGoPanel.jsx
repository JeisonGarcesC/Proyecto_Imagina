// src/components/KuoGoPanel.jsx
import { useState } from 'react';

export default function KuoGoPanel({ threeApiRef }) {
  const [inserting, setInserting] = useState(false);

  // Configuración inicial por defecto al insertar
  const defaultTipoKey = 'Kume200000';
  const defaultEspesor = 'Espesor Formica 18';
  const defaultEspecial = false;

  async function handleInsert() {
    const api = threeApiRef?.current;
    if (!api?.addKuoGo) {
      console.warn('[KuoGoPanel] threeApiRef.current.addKuoGo no está disponible.');
      return;
    }
    setInserting(true);
    try {
      await api.addKuoGo({ 
        tipoKey: defaultTipoKey, 
        espesor: defaultEspesor, 
        especial: defaultEspecial 
      });
    } catch (err) {
      console.error('[KuoGoPanel] Error al insertar Kuo Go:', err);
    } finally {
      setInserting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>Kuo Go</div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
          Producto Kuo Go
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
          title="Kuo Go Base"
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
          {/* Opcional: Podrías usar <CardImage> si tuvieras una carpeta IMAGE_FOLDER_SETS.kuoGo */}
          <div style={{ width: '100%', height: 120, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
            <span style={{ fontSize: 32 }}>K</span>
          </div>
          <div style={{ fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word', fontSize: 13 }}>
            Kuo Go Base
          </div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.85,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            Insertar modelo base
          </div>
        </button>
      </div>
    </div>
  );
}
