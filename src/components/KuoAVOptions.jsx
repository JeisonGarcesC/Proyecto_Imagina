import { useId } from 'react';
import { KUO_AV_TUNABLES } from '../mepal/kuoAV/config/kuoAVTunables.js';
import { KUO_AV_DOBLE_RANGOS } from '../mepal/kuoAVDoble/config/kuoAVDobleTunables.js';

const SCREEN_TYPES = [
  ['FMT', 'Formica / Melamina / Tela'],
  ['VIDRIO', 'Vidrio Laminado'],
  ['FRONTAL_PERIMETRAL', 'Frontal Perimetral (Vidrio 4+4)'],
];

const buttonStyle = (selected) => ({
  flex: '1 1 65px',
  padding: '6px 4px',
  border: '1px solid #a6c9a2',
  borderRadius: 4,
  background: selected ? '#fff' : '#cce6c9',
  color: '#173c1d',
  fontWeight: selected ? 700 : 500,
  cursor: 'pointer',
  fontSize: 12,
});

export default function KuoAVOptions({ config, onChange, isDoble = false }) {
  const id = useId();
  const minHeight = KUO_AV_TUNABLES.ALTURA_MIN_MM;
  const raisedHeight = isDoble
    ? Math.max(...KUO_AV_DOBLE_RANGOS.alturasPermitidas)
    : KUO_AV_TUNABLES.ALTURA_MAX_MM;
  const grommetFinish = String(config.acabadoGrommet || 'ALUMINIUM').trim().toUpperCase();
  const paintedGrommet = !['ALUMINIUM', 'ALUMINIO', 'ANODIZADO', 'NONE'].includes(grommetFinish);
  const vertebraLateral = !!config.vertebraLateral;
  const pantalla = !!(config.pantalla || config.pantallaEnabled);
  const pantallaTipo = isDoble ? config.pantallaTipo || 'FORMICA' : 'FRONTAL_PERIMETRAL';
  const pantallaFamilia = ['FORMICA', 'MELAMINA', 'TELA'].includes(pantallaTipo)
    ? 'FMT'
    : pantallaTipo;
  const screenTypes = isDoble
    ? SCREEN_TYPES
    : SCREEN_TYPES.filter(([value]) => value === 'FRONTAL_PERIMETRAL');

  function checkbox(label, checked, change) {
    return (
      <label style={{ display: 'contents', cursor: 'pointer' }}>
        <span style={{ lineHeight: 1.3 }}>{label}</span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(change(event.target.checked))}
          style={{ justifySelf: 'start', width: 16, height: 16 }}
        />
      </label>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          ['Ancho', 'anchoMm', KUO_AV_TUNABLES.ANCHOS_MM],
          ['Profundidad', 'profundidadMm', KUO_AV_TUNABLES.FONDOS_MM],
        ].map(([label, key, values]) => (
          <label key={key} style={{ fontSize: 12 }}>
            {label}
            <select
              value={config[key] || values[0]}
              onChange={(event) => onChange({ [key]: Number(event.target.value) })}
              style={{ width: '100%', marginTop: 4 }}
            >
              {values.map((value) => <option key={value} value={value}>{value} mm</option>)}
            </select>
          </label>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(100px, 0.9fr) minmax(0, 1.4fr)',
        alignItems: 'center',
        gap: '10px 8px',
        padding: 10,
        border: '1px solid #b8dcb4',
        borderRadius: 8,
        background: '#d9efd7',
        fontSize: 12,
      }}>
        <span id={`${id}-surface`}>Espesor Superficie</span>
        <div role="group" aria-labelledby={`${id}-surface`} style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {['Formica 30', 'Melamina 30'].map((material) => (
            <button
              key={material}
              type="button"
              aria-pressed={(config.espesorTipo || config.espesor || 'Formica 30') === material}
              style={buttonStyle((config.espesorTipo || config.espesor || 'Formica 30') === material)}
              onClick={() => onChange({ espesorTipo: material, espesor: material, thickMm: 30 })}
            >
              {material}
            </button>
          ))}
        </div>

        <span id={`${id}-kit`}>Kit Fuente</span>
        <div role="group" aria-labelledby={`${id}-kit`} style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {['Blanco', 'Negro', 'Gris'].map((color) => (
            <button
              key={color}
              type="button"
              aria-pressed={config.kitFuente !== false && (config.kitFuenteColor || 'Blanco') === color}
              style={buttonStyle(config.kitFuente !== false && (config.kitFuenteColor || 'Blanco') === color)}
              onClick={() => onChange({
                kitFuente: true,
                kitFuenteColor: color,
                ...(isDoble ? { acabadoParales: color } : {}),
              })}
            >
              Kit Fuente {color}
            </button>
          ))}
        </div>

        {checkbox('Acabado de Grommet (Anodizado/Pintura)', paintedGrommet,
          (checked) => ({ acabadoGrommet: checked ? 'PAINTED' : 'ALUMINIUM' }))}
        {checkbox('Especial/Rematable', !!config.especial, (checked) => ({ especial: checked }))}
        {isDoble && checkbox('Baldosa Formica', !!config.baldosaFormica,
          (checked) => ({ baldosaFormica: checked }))}
        {isDoble && checkbox('Costado Intermedio KUSO820000', !!config.costadoIntermedio,
          (checked) => ({ costadoIntermedio: checked }))}
        {checkbox('Aumentar Altura', Number(config.alturaMm || minHeight) > minHeight,
          (checked) => ({ alturaMm: checked ? raisedHeight : minHeight,
            ...(isDoble ? { aumentarAltura: checked } : {}) }))}
        {checkbox('Elevar kit F izquierdo', !!config.elevarKitFIzquierdo,
          (checked) => ({ elevarKitFIzquierdo: checked }))}
        {checkbox('Colocar Vértebra Lateral', !!vertebraLateral,
          (checked) => ({
            vertebraLateral: checked,
            ...(isDoble ? { vertebraLeftEnabled: true, vertebraRightEnabled: true } : {}),
          }))}
      </div>

      <div style={{ display: 'grid', gap: 8, padding: 10, border: '1px solid #ddd', borderRadius: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={pantalla}
            onChange={(event) => onChange({ pantalla: event.target.checked, pantallaEnabled: event.target.checked })}
          />
          Incluir pantalla
        </label>
        {pantalla && (
          <>
            <label style={{ fontSize: 12 }}>
              Material de pantalla
              <select
                value={pantallaFamilia}
                onChange={(event) => onChange({
                  pantallaTipo: event.target.value === 'FMT' ? 'FORMICA' : event.target.value,
                  ...(event.target.value === 'FRONTAL_PERIMETRAL' ? { pantallaPosicion: 'CENTRAL' } : {}),
                })}
                style={{ width: '100%' }}
              >
                {screenTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            {isDoble && pantallaFamilia === 'FMT' && (
              <label style={{ fontSize: 12 }}>
                Acabado de pantalla
                <select
                  value={pantallaTipo}
                  onChange={(event) => onChange({ pantallaTipo: event.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="FORMICA">Formica</option>
                  <option value="MELAMINA">Melamina</option>
                  <option value="TELA">Tela</option>
                </select>
              </label>
            )}
            {isDoble && pantallaFamilia !== 'FRONTAL_PERIMETRAL' && (
              <label style={{ fontSize: 12 }}>
                Ubicación de pantalla
                <select
                  value={config.pantallaPosicion || 'CENTRAL'}
                  onChange={(event) => onChange({ pantallaPosicion: event.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="CENTRAL">Central</option>
                  <option value="POSTERIOR">Posterior</option>
                  <option value="FRONTAL">Frontal</option>
                </select>
              </label>
            )}
          </>
        )}
      </div>
    </div>
  );
}
