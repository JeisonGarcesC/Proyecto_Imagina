import React from 'react';

const input = { width: '100%', boxSizing: 'border-box', padding: '6px 8px' };
const label = { display: 'grid', gap: 4, fontSize: 12 };

export default function DoorProperties({ door, onChange, onDelete, onClose }) {
  if (!door) return null;
  const disabled = door.locked;
  return <div style={{ display: 'grid', gap: 8, padding: 10, border: '1px solid #ddd', borderRadius: 8 }}>
    <strong>Propiedades de puerta</strong>
    <label style={label}>Ancho (m)<input style={input} disabled={disabled} type="number" min="0.01" step="0.05" value={door.width} onChange={(e) => onChange?.({ width: Number(e.target.value) })} /></label>
    <label style={label}>Altura (m)<input style={input} disabled={disabled} type="number" min="0.01" step="0.05" value={door.height} onChange={(e) => onChange?.({ height: Number(e.target.value) })} /></label>
    <label style={label}>Offset desde inicio al centro (m)<input style={input} disabled={disabled} type="number" min="0" step="0.05" value={door.offset} onChange={(e) => onChange?.({ offset: Number(e.target.value) })} /></label>
    <label style={label}>Giro<select style={input} disabled={disabled} value={door.swingDirection} onChange={(e) => onChange?.({ swingDirection: e.target.value })}><option value="LEFT">LEFT</option><option value="RIGHT">RIGHT</option></select></label>
    <label style={label}>Lado<select style={input} disabled={disabled} value={door.swingSide} onChange={(e) => onChange?.({ swingSide: e.target.value })}><option value="INSIDE">INSIDE</option><option value="OUTSIDE">OUTSIDE</option></select></label>
    <label style={label}>Ángulo (°)<input style={input} disabled={disabled} type="number" min="0" max="180" step="5" value={Math.round(door.openingAngle * 180 / Math.PI)} onChange={(e) => onChange?.({ openingAngle: Number(e.target.value) * Math.PI / 180 })} /></label>
    <label><input type="checkbox" checked={door.visible} disabled={disabled} onChange={(e) => onChange?.({ visible: e.target.checked })} /> Visible</label>
    <label><input type="checkbox" checked={door.locked} onChange={(e) => onChange?.({ locked: e.target.checked })} /> Bloqueada</label>
    <div style={{ display: 'flex', gap: 6 }}><button type="button" disabled={disabled} onClick={onDelete}>Eliminar</button><button type="button" onClick={onClose}>Cerrar</button></div>
  </div>;
}
