import { useEffect, useMemo, useState } from 'react';
import VetroConfigFields from './VetroConfigFields.jsx';
import { defaultVetroConfig } from '../definitions/vetroUiDefaults.js';
import { resolveVetroProduct } from '../resolvers/vetroProductResolver.js';
import VetroBasicSystemPanel from './VetroBasicSystemPanel.jsx';

export default function VetroPanel({ onCreate, onCreateSystem, onGroupDoor, onConnectDoor, onDisconnectDoor, onConnectWallArrival, onDisconnectWallArrival, onGetDoorState, onUpdateDoorState, selectedPart, readOnly = false }) {
  const [mode, setMode] = useState('PRODUCT');
  const [section, setSection] = useState('PANEL');
  const [config, setConfig] = useState(() => defaultVetroConfig('PANEL'));
  const [groupMessage, setGroupMessage] = useState('');
  const [doorState, setDoorState] = useState(null);
  const [angleDraft, setAngleDraft] = useState(0);
  const [doorFrameFinish, setDoorFrameFinish] = useState('ANODIZED');
  const [doorFrameWithDuct, setDoorFrameWithDuct] = useState(false);
  useEffect(() => {
    const next = onGetDoorState?.() || null;
    setDoorState(next);
    setAngleDraft(next?.angleDeg || 0);
  }, [selectedPart, onGetDoorState]);
  const changeDoor = (patch) => {
    const result = onUpdateDoorState?.(patch);
    if (result?.success) { setDoorState(result.state); setAngleDraft(result.state.angleDeg); }
    else setGroupMessage('Selecciona un conjunto de puerta VETRO.');
  };
  const resolved = useMemo(() => resolveVetroProduct(config), [config]);
  const changeSection = (value) => { setSection(value); setConfig(defaultVetroConfig(value)); };
  const missing = !resolved.codeResolution.supported;
  const heightConflict = resolved.diagnostics.some((item) => item.code === 'VETRO_HEIGHT_280_318_CONFLICT');
  if (mode === 'SYSTEM') return <div style={{ display: 'grid', gap: 12 }}><button type="button" onClick={() => setMode('PRODUCT')}>Productos individuales</button><VetroBasicSystemPanel onCreate={onCreateSystem} readOnly={readOnly} /></div>;
  return <div style={{ display: 'grid', gap: 12 }}>
    <h3 style={{ margin: 0 }}>VETRO</h3>
    <button type="button" onClick={() => setMode('SYSTEM')}>Crear sistema por medidas exteriores</button>
    <button type="button" disabled={readOnly} onClick={async () => {
      const result = await onGroupDoor?.();
      setGroupMessage(result?.success ? 'Marco y nave agrupados.' : 'Selecciona un marco y una nave compatibles con Ctrl + clic.');
    }}>Agrupar marco y nave seleccionados</button>
    <button type="button" disabled={readOnly} onClick={() => {
      const result = onConnectDoor?.();
      setGroupMessage(result?.success ? 'Armado conectado a la Línea.' : 'Acerca y selecciona el armado junto a un extremo libre de la Línea.');
    }}>Conectar armado al extremo cercano</button>
    <button type="button" disabled={readOnly} onClick={() => {
      setGroupMessage(onDisconnectDoor?.() ? 'Armado desconectado.' : 'Selecciona un armado conectado.');
    }}>Desconectar armado</button>
    <button type="button" disabled={readOnly} onClick={() => {
      const result = onConnectWallArrival?.();
      setGroupMessage(result?.success ? 'Kit de llegada conectado al extremo VETRO.' : 'Selecciona el kit junto a un extremo libre y de la misma altura.');
    }}>Conectar kit de llegada a pared</button>
    <button type="button" disabled={readOnly} onClick={() => {
      setGroupMessage(onDisconnectWallArrival?.() ? 'Kit de llegada desconectado.' : 'Selecciona un kit de llegada conectado.');
    }}>Desconectar kit de llegada</button>
    {groupMessage && <p style={{ margin: 0, fontSize: 12 }}>{groupMessage}</p>}
    {section === 'DOOR_LEAF' && <div style={{ display: 'grid', gap: 8 }}>
      <label>Acabado del marco <select value={doorFrameFinish} disabled={readOnly} onChange={(e) => setDoorFrameFinish(e.target.value)}><option value="ANODIZED">Anodizado</option><option value="PAINTED">Pintado</option></select></label>
      <label><input type="checkbox" checked={doorFrameWithDuct} disabled={readOnly} onChange={(e) => setDoorFrameWithDuct(e.target.checked)} /> Marco con ducto</label>
    </div>}
    {doorState && <div style={{ display: 'grid', gap: 8, padding: 10, border: '1px solid #d8d8d8', borderRadius: 8 }}>
      <b>Puerta seleccionada</b>
      <label>Mano <select disabled={readOnly} value={doorState.hand} onChange={(e) => changeDoor({ hand: e.target.value })}><option value="LH">Izquierda (LH)</option><option value="RH">Derecha (RH)</option></select></label>
      <label>Sentido <select disabled={readOnly} value={doorState.swing} onChange={(e) => changeDoor({ swing: e.target.value })}><option value="FRONT">Frente</option><option value="BACK">Reverso</option></select></label>
      <label>Ángulo de apertura (0°–90°) <input type="number" min="0" max="90" step="1" disabled={readOnly} value={angleDraft} onChange={(e) => setAngleDraft(e.target.value)} onBlur={() => changeDoor({ angleDeg: Number(angleDraft) })} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></label>
      <div style={{ display: 'flex', gap: 4 }}>{[0, 45, 90].map((angle) => <button key={angle} type="button" disabled={readOnly} onClick={() => changeDoor({ angleDeg: angle })}>{angle === 0 ? 'Cerrada' : `${angle}°`}</button>)}</div>
    </div>}
    <VetroConfigFields section={section} config={config} onSectionChange={changeSection} onChange={setConfig} disabled={readOnly} />
    <div style={{ padding: 10, borderRadius: 8, background: missing ? '#fff1f2' : '#f4f7f5', fontSize: 12 }}>
      <div><b>{resolved.special ? 'SKU de facturación (nominal superior)' : 'Código'}:</b> {resolved.codeResolution.code || 'No documentado'}</div>
      {resolved.special && <div>Medida especial: {resolved.special.realWidthMm} × {resolved.special.projectHeightMm} mm.</div>}
      <div><b>Referencia:</b> {resolved.commercial.reference || 'No documentada'}</div>
      {missing && <div style={{ color: '#b91c1c' }}>VETRO_CODE_NOT_DOCUMENTED</div>}
      {heightConflict && <div style={{ color: '#92400e' }}>VETRO_HEIGHT_280_318_CONFLICT - definicion tecnica pendiente.</div>}
      <div style={{ marginTop: 4, opacity: 0.7 }}>Modelo 3D: asset no disponible.</div>
    </div>
    <button type="button" disabled={readOnly || missing} onClick={async () => {
      const result = await onCreate?.(section === 'DOOR_LEAF' ? { ...config, doorFrameFinish, doorFrameWithDuct } : config);
      if (section === 'DOOR_LEAF' && result?.success === false) setGroupMessage('No hay SKU documentado para esta combinación de marco y nave.');
      else if (section === 'DOOR_LEAF' && result?.success) setGroupMessage('Conjunto de puerta creado.');
    }} style={{ padding: 11, borderRadius: 10, border: '1px solid #d8d8d8', fontWeight: 800, cursor: readOnly || missing ? 'not-allowed' : 'pointer' }}>{section === 'DOOR_LEAF' ? 'Agregar conjunto de puerta VETRO' : 'Agregar producto VETRO'}</button>
  </div>;
}
