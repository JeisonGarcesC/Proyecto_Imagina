import { useState } from 'react';

const COLORS = { TILE_FORMICA: '#ddd5c5', TILE_METAL: '#9ca3af', TILE_GLASS: '#9ed6df', DOOR_LEAF: '#cfc7b8', GROWTH_MODULE: '#4b5563' };
export default function MultiplePreviewPanel({ product }) {
  const [view, setView] = useState('FRONT'); const [commercialOnly, setCommercialOnly] = useState(true);
  if (!product) return null;
  const parts = product.parts.filter((part) => !commercialOnly || part.commercial.includeInBOM !== false);
  const slots = product.composition.slots.filter((slot) => slot.type !== 'DOOR');
  return <div style={{ display: 'grid', gap: 7 }}><b>Vista comercial</b>
    <div style={{ display: 'flex', gap: 6 }}><button onClick={() => setView('FRONT')}>Frontal</button><button onClick={() => setView('ISOMETRIC')}>Isométrica</button><label style={{ fontSize: 11 }}><input type="checkbox" checked={commercialOnly} onChange={(e) => setCommercialOnly(e.target.checked)}/> Solo comercial</label></div>
    <div style={{ width: 150, height: 210, padding: 5, border: '5px solid #4b5563', background: '#ececec', display: 'flex', flexDirection: 'column-reverse', transform: view === 'ISOMETRIC' ? 'perspective(500px) rotateY(-28deg)' : 'none', transformOrigin: 'left center' }}>
      {product.composition.baseboardHeightCm > 0 && <div style={{ height: `${product.composition.baseboardHeightCm / product.dimensions.baseHeightCm * 100}%`, background: '#555' }}/>} 
      {product.config.door?.enabled ? <div style={{ flex: 1, background: COLORS.DOOR_LEAF, border: '2px solid #555' }}>Puerta</div> : slots.map((slot, index) => { const role = product.parts.find((part) => part.componentKey === slot.componentKey)?.componentRole; return <div key={slot.slotKey} title={`${slot.tileType} ${slot.heightCm * 10} mm`} style={{ height: `${slot.heightCm / product.dimensions.baseHeightCm * 100}%`, background: COLORS[role] || '#ccc', borderTop: '2px solid #555', fontSize: 10, display: 'grid', placeItems: 'center' }}>{slot.tileType}</div>; })}
    </div>
    <div style={{ fontSize: 11, opacity: 0.7 }}>{parts.length} componentes visibles</div>
  </div>;
}
