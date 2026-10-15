import { useId } from 'react';
import {
  KUO_AV_TUNABLES,
  formatKuoAVCm,
  resolveKuoAVDimensionOptions,
  resolveKuoAVNominalDepth,
  resolveKuoAVNominalWidth,
} from '../mepal/kuoAV/config/kuoAVTunables.js';
import { KUO_AV_DOBLE_RANGOS } from '../mepal/kuoAVDoble/config/kuoAVDobleTunables.js';
import { KUO_AV_DOBLE_INTERMEDIATE_SUPPORTS } from '../mepal/kuoAVDoble/bom/kuoAVDobleBOMCatalog.js';

// Mapa de producto pág. 19: pantalla doble en vidrio, acústica (tela), fórmica o melamínico.
// La frontal perimetral (pág. 20, vidrio 4+4) solo aplica al puesto sencillo.
const SCREEN_TYPES = [
  ['FORMICA', 'Fórmica (KUAC690000)'],
  ['MELAMINA', 'Melamínico (KUAC700000)'],
  ['TELA', 'Acústica tapizada (KUAC670000)'],
  ['VIDRIO', 'Vidrio (KUAC660000)'],
  ['FRONTAL_PERIMETRAL', 'Frontal Perimetral (Vidrio 4+4)'],
];

const buttonStyle = (selected) => ({
  width: '100%',
  minHeight: 34,
  padding: '6px 8px',
  border: `1px solid ${selected ? '#86b99a' : '#d1d5db'}`,
  borderRadius: 7,
  background: selected ? '#eaf5ee' : '#fff',
  color: '#1f2937',
  fontWeight: selected ? 700 : 500,
  cursor: 'pointer',
  fontSize: 12,
  lineHeight: 1.25,
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
  const screenTypes = isDoble
    ? SCREEN_TYPES.filter(([value]) => value !== 'FRONTAL_PERIMETRAL')
    : SCREEN_TYPES.filter(([value]) => value === 'FRONTAL_PERIMETRAL');

  function checkbox(label, checked, change) {
    return (
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 30, lineHeight: 1.3, cursor: 'pointer' }}>
        <span>
          {label}
        </span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(change(event.target.checked))}
          style={{ width: 16, height: 16, margin: 0, flexShrink: 0, accentColor: '#16803c' }}
        />
      </label>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          ['Ancho', 'anchoMm', resolveKuoAVDimensionOptions('width', !!config.especial)],
          ['Profundidad', 'profundidadMm', resolveKuoAVDimensionOptions('depth', !!config.especial)],
        ].map(([label, key, values]) => (
          <label key={key} style={{ fontSize: 12 }}>
            {label}
            <select
              value={values.reduce((best, value) => (
                Math.abs(value - Number(config[key])) < Math.abs(best - Number(config[key])) ? value : best
              ), values[0])}
              onChange={(event) => onChange({ [key]: Number(event.target.value) })}
              style={{ width: '100%', marginTop: 4, minHeight: 34, color: '#1f2937', background: '#fff', border: '1px solid #d1d5db', borderRadius: 7, padding: '4px 8px', colorScheme: 'light' }}
            >
              {values.map((value) => <option key={value} value={value}>{formatKuoAVCm(value)} cm</option>)}
            </select>
          </label>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: 8,
        padding: 10,
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        background: '#f8fafc',
        fontSize: 12,
        color: '#1f2937',
      }}>
        <span id={`${id}-surface`} style={{ fontWeight: 600 }}>Espesor Superficie</span>
        <div role="group" aria-labelledby={`${id}-surface`} style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
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

        <span id={`${id}-kit`} style={{ fontWeight: 600 }}>Kit Fuente</span>
        <div role="group" aria-labelledby={`${id}-kit`} style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
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
              {color}
            </button>
          ))}
        </div>

        {checkbox('Acabado de Grommet (Anodizado/Pintura)', paintedGrommet,
          (checked) => ({ acabadoGrommet: checked ? 'PAINTED' : 'ALUMINIUM' }))}
        {checkbox('Especial/Rematable', !!config.especial, (checked) => (checked
          ? { especial: true }
          : {
              especial: false,
              anchoMm: resolveKuoAVNominalWidth(config.anchoMm),
              profundidadMm: resolveKuoAVNominalDepth(config.profundidadMm),
            }))}
        {isDoble && checkbox('Baldosa Formica', !!config.baldosaFormica,
          (checked) => ({ baldosaFormica: checked }))}
        {isDoble && (
          <label style={{ display: 'grid', gap: 4, fontWeight: 600 }}>
            Soporte intermedio (unión entre puestos)
            <select
              value={config.soporteIntermedio || 'AUTO'}
              onChange={(event) => onChange({ soporteIntermedio: event.target.value })}
              style={{ width: '100%', minHeight: 34, color: '#1f2937', background: '#fff', border: '1px solid #d1d5db', borderRadius: 7, padding: '4px 8px', fontWeight: 400, colorScheme: 'light' }}
            >
              {KUO_AV_DOBLE_INTERMEDIATE_SUPPORTS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <span style={{ fontWeight: 400, fontSize: 11, color: '#6b7280' }}>
              Cambia solo la unión del puesto seleccionado con el anterior.
              El primer puesto no tiene unión intermedia propia.
              Solo aplica con 2 o más puestos dobles unidos y sin Baldosa Formica.
            </span>
          </label>
        )}
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

      <div style={{ display: 'grid', gap: 8, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#1f2937' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={pantalla}
            onChange={(event) => onChange({
              pantalla: event.target.checked,
              pantallaEnabled: event.target.checked,
              ...(isDoble && event.target.checked ? { pantallaPosicion: 'CENTRAL' } : {}),
            })}
          />
          Incluir pantalla
        </label>
        {pantalla && (
          <>
            <label style={{ fontSize: 12 }}>
              Material de pantalla
              <select
                value={pantallaTipo}
                onChange={(event) => onChange({
                  pantallaTipo: event.target.value,
                  ...(event.target.value === 'FRONTAL_PERIMETRAL' ? { pantallaPosicion: 'CENTRAL' } : {}),
                })}
                style={{ width: '100%', minHeight: 36, padding: '6px 8px', color: '#1f2937', background: '#fff', border: '1px solid #d1d5db', borderRadius: 7, colorScheme: 'light' }}
              >
                {screenTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </>
        )}
      </div>
    </div>
  );
}
