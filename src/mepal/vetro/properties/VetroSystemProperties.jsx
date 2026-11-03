import { useState } from 'react';

export default function VetroSystemProperties({ part, api, readOnly = false }) {
  const [message, setMessage] = useState('');
  const connections = api?.getVetroSystemConnections?.(part?.systemId) || [];
  return <div className="pp-shell"><div className="pp-header"><p className="pp-title">Sistema VETRO {part?.shape === 'LINE' ? 'Línea' : part?.shape}</p></div>
    <div className="pp-section" style={{ display: 'grid', gap: 8 }}>
      <div>Medida solicitada: {part?.requestedWidthMm} × {part?.heightMm} mm</div>
      <div>Medida real del modelo provisional: {part?.measurement?.widthMm?.toFixed?.(1) ?? '—'} mm</div>
      <button type="button" disabled={readOnly} onClick={async () => {
        const result = await api?.connectVetroSystemToNearest?.();
         setMessage(result?.success ? 'Sistema conectado.' : result?.reason === 'VETRO_CONNECTED_CLUSTER_MUST_BE_ALIGNED_FIRST' ? 'Alinea primero el conjunto conectado con el nuevo sistema.' : result?.reason || 'No se encontró un terminal compatible.');
      }}>Conectar al sistema cercano</button>
      {connections.map((item) => <div key={item.connectionId}>
        {item.type} · {item.targetSystemId}
        <button type="button" disabled={readOnly} onClick={() => {
          const removed = api?.disconnectSelectedVetroSystem?.(item.connectionId);
          setMessage(removed ? 'Conexión retirada.' : 'No se pudo desconectar.');
        }}>Desconectar</button>
      </div>)}
      {message && <div>{message}</div>}
    </div>
  </div>;
}
