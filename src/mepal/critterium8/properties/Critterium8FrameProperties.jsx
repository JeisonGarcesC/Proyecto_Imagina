import { CRITTERIUM8_CODED_FRAME_WIDTHS_CM, CRITTERIUM8_HALF_HEIGHTS_CM } from '../catalog/frameCatalog.js';
import { getCritterium8FullTileHeight } from '../rules/frameCompositionRules.js';

const fieldStyle = { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #d8d8d8', borderRadius: 8, background: '#fff' };

export default function Critterium8FrameProperties({ config, disabled, onChange }) {
  const fullTileAllowed = Boolean(getCritterium8FullTileHeight(config?.heightCm));
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <label style={fieldStyle}>Ancho (cm)
        <select style={inputStyle} value={config.widthCm} disabled={disabled} onChange={(event) => onChange({ widthCm: Number(event.target.value) })}>
          {CRITTERIUM8_CODED_FRAME_WIDTHS_CM.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label style={fieldStyle}>Altura (cm)
        <select style={inputStyle} value={config.heightCm} disabled={disabled} onChange={(event) => onChange({ heightCm: Number(event.target.value), projectHeightCm: Number(event.target.value) })}>
          {CRITTERIUM8_HALF_HEIGHTS_CM.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label style={fieldStyle}>Composición
        <select style={inputStyle} value={config.compositionMode} disabled={disabled} onChange={(event) => onChange({ compositionMode: event.target.value })}>
          <option value="MODULAR">Modular</option>
          <option value="FULL_TILE" disabled={!fullTileAllowed}>Baldosa plena</option>
        </select>
      </label>
      {!fullTileAllowed && <div style={{ fontSize: 11, color: '#7c2d12' }}>Baldosa plena no documentada para esta altura.</div>}
    </div>
  );
}
