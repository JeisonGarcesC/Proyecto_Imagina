import { useState } from 'react';
import KuoAVOptions from './KuoAVOptions.jsx';

export default function KuoAVPanel({ threeApiRef }) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [tipoPuesto, setTipoPuesto] = useState('sencillo');
  const [numPuestos, setNumPuestos] = useState(1);
  const [config, setConfig] = useState({
    anchoMm: 1200,
    profundidadMm: 600,
    alturaMm: 730,
    thickMm: 30,
    espesorTipo: 'Formica 30',
    kitFuente: true,
    kitFuenteColor: 'Blanco',
    elevarKitFIzquierdo: false,
    acabadoGrommet: 'ALUMINIUM',
    especial: false,
    vertebraLateral: false,
    baldosaFormica: false,
    costadoIntermedio: false,
    pantalla: false,
    pantallaEnabled: false,
    pantallaTipo: 'FRONTAL_PERIMETRAL',
    pantallaPosicion: 'CENTRAL',
  });
  const isDoble = tipoPuesto === 'doble';

  function changeType(type) {
    setTipoPuesto(type);
    setConfig((previous) => ({
      ...previous,
      alturaMm: 730,
      ...(type === 'doble' ? { pantallaPosicion: 'CENTRAL' } : {}),
      ...(type === 'sencillo' ? { pantallaTipo: 'FRONTAL_PERIMETRAL' } : {}),
      ...(type === 'doble' && previous.pantallaTipo === 'FRONTAL_PERIMETRAL'
        ? { pantallaTipo: 'FORMICA' }
        : {}),
    }));
  }

  async function handleCreate() {
    const api = threeApiRef?.current;
    setCreating(true);
    setError('');
    try {
      const add = isDoble ? api?.addKuoAVDoble : api?.addKuoAV;
      if (typeof add !== 'function') {
        throw new Error('El editor 3D no está disponible para crear el puesto Kuo AV.');
      }
      const batchId = `KUO_BATCH_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
      const stepM = Number(config.anchoMm) / 1000;
      let baseOffsetM = 0;
      for (let i = 0; i < numPuestos; i += 1) {
        const result = await add({
          ...config,
          kitFuente: true,
          ...(isDoble ? {
            vertebraLeftEnabled: true,
            vertebraRightEnabled: true,
          } : {}),
          kuoBatchId: batchId,
          ...(i > 0 ? { position: [baseOffsetM + i * stepM, 0, 0] } : {}),
        });
        if (!result?.object) {
          throw new Error('El editor 3D no pudo insertar el puesto Kuo AV.');
        }
        if (i === 0) baseOffsetM = result.object.position.x;
      }
    } catch (err) {
      console.error('[KuoAVPanel] Error al crear puesto Kuo AV:', err);
      setError(err.message || 'No se pudo crear el puesto Kuo AV.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Kuo Altura Variable</div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
          Configura el puesto y créalo con sus partes y BOM completos
        </div>
      </div>
      <fieldset disabled={creating} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 14 }}>
        <div>
          <div style={{ fontSize: 12 }}>Tipo de puesto</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
            {[['sencillo', '1 Puesto (Perimetral)'], ['doble', '2 Puestos (Doble)']].map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => changeType(type)}
                aria-pressed={tipoPuesto === type}
                style={{
                  padding: '8px 6px', borderRadius: 8, border: '1px solid #dfdfdf',
                  fontWeight: tipoPuesto === type ? 700 : 400,
                  background: tipoPuesto === type ? '#eef2ff' : '#fff', cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label style={{ fontSize: 12 }}>
          Número de puestos a crear (unidos en esta configuración)
          <select value={numPuestos} onChange={(event) => setNumPuestos(Number(event.target.value))} style={{ width: '100%' }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? 'puesto' : 'puestos'}</option>
            ))}
          </select>
        </label>
        <KuoAVOptions
          config={config}
          isDoble={isDoble}
          onChange={(changes) => setConfig((previous) => ({ ...previous, ...changes }))}
        />
      </fieldset>
      <div style={{ fontSize: 12, background: '#f8f8f8', borderRadius: 8, padding: 8 }}>
        <div>Tipo: {isDoble ? 'Puesto Doble (cara a cara)' : 'Puesto Sencillo (Perimetral)'}</div>
        <div>Dimensión: {config.anchoMm} x {config.profundidadMm} mm, {config.espesorTipo}</div>
        <div>Altura: {config.alturaMm} mm</div>
        <div>Puestos a crear: {numPuestos} (unidos borde a borde)</div>
        <div>Esta configuración se inserta separada de las anteriores.</div>
        <div>Kit fuente: {config.kitFuenteColor}</div>
        <div>Pantalla: {config.pantalla ? config.pantallaTipo : 'No incluida'}</div>
      </div>
      {error && <div role="alert" style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}
      <button
        type="button"
        disabled={creating}
        onClick={handleCreate}
        style={{
          padding: 12, borderRadius: 10, border: 'none',
          background: creating ? '#9ca3af' : '#1a56db', color: '#fff',
          fontWeight: 800, fontSize: 13, cursor: creating ? 'not-allowed' : 'pointer',
        }}
      >
        {creating ? 'Creando…' : numPuestos > 1 ? `Crear ${numPuestos} puestos` : 'Crear puesto'}
      </button>
    </div>
  );
}
