import { useMemo, useState } from 'react';
import { planVetroLine } from '../composition/vetroLinePlanner.js';
import { VETRO_PANEL_WIDTHS } from '../catalog/panelCatalog.js';
import { resolveVetroPanelSize } from '../rules/vetroPanelSize.js';

export default function VetroBasicSystemPanel({ onCreate, readOnly = false }) {
  const [requestedWidthMm, setRequestedWidthMm] = useState(1800);
  const [heightMm, setHeightMm] = useState(2040);
  const [shape, setShape] = useState('LINE');
  const [returnWidthMm, setReturnWidthMm] = useState(1800);
  const [searched, setSearched] = useState(false);
  const [createdMeasurement, setCreatedMeasurement] = useState(null);
  const [specialOpen, setSpecialOpen] = useState(true);
  const [specialWidthEnabled, setSpecialWidthEnabled] = useState(false);
  const [specialHeightEnabled, setSpecialHeightEnabled] = useState(false);
  const [specialNominalWidthCm, setSpecialNominalWidthCm] = useState(90);
  const [specialWidthMm, setSpecialWidthMm] = useState(850);
  const [specialHeightMm, setSpecialHeightMm] = useState(2500);
  const plan = useMemo(() => planVetroLine({ requestedWidthMm, heightMm }), [requestedWidthMm, heightMm]);
  const returnPlan = useMemo(() => shape !== 'LINE' ? planVetroLine({ requestedWidthMm: returnWidthMm, heightMm }) : null, [shape, returnWidthMm, heightMm]);
  const specialSize = resolveVetroPanelSize({ material: 'TEMPERED_GLASS_10MM', nominalWidthCm: specialNominalWidthCm, nominalHeightCm: heightMm / 10, specialWidthMm: specialWidthEnabled ? specialWidthMm : null, specialHeightMm: specialHeightEnabled ? specialHeightMm : null });
  return <section style={{ display: 'grid', gap: 8 }}>
    <h3 style={{ margin: 0 }}>Crear sistema por medidas exteriores</h3>
    <label>Forma <select value={shape} onChange={(event) => { setShape(event.target.value); setSearched(false); }}><option value="LINE">Línea</option><option value="L">L</option><option value="T">T</option></select></label>
    <label>Ancho exterior solicitado (mm) <input type="number" min="300" max="6000" step="1" value={requestedWidthMm} onChange={(event) => { setRequestedWidthMm(Number(event.target.value)); setSearched(false); }} /></label>
    <label>Altura comercial (mm) <select value={heightMm} onChange={(event) => { setHeightMm(Number(event.target.value)); setSearched(false); }}><option value={2040}>2040</option><option value={2420}>2420</option><option value={2800}>2800</option><option value={3180}>3180</option></select></label>
    {shape !== 'LINE' && <label>{shape === 'T' ? 'Derivación perpendicular solicitada' : 'Segundo brazo solicitado'} (mm) <input type="number" min="300" max="6000" value={returnWidthMm} onChange={(event) => { setReturnWidthMm(Number(event.target.value)); setSearched(false); }} /></label>}
    <button type="button" onClick={() => setSearched(true)}>Buscar composiciones</button>
    {shape === 'LINE' && Number(requestedWidthMm) > 6000 && <p>La longitud máxima de una línea VETRO es de 6000 mm. Para longitudes mayores se requiere dividir el sistema mediante una columna/soporte o crear tramos independientes.</p>}
    {heightMm === 3180 && <p>La referencia de 3180 mm existe en catálogo; la ficha limita este sistema piso techo a 2800 mm.</p>}
    <button type="button" onClick={() => setSpecialOpen(!specialOpen)}>{specialOpen ? 'Cerrar medida especial' : '+ Medida especial'}</button>
    {specialOpen && <div style={{ display: 'grid', gap: 6, border: '1px solid #ddd', padding: 8 }}>
      <b>Panel de vidrio especial · una pieza</b>
      <label>Ancho comercial base <select value={specialNominalWidthCm} onChange={(event) => setSpecialNominalWidthCm(Number(event.target.value))}>{VETRO_PANEL_WIDTHS.map((item) => <option key={item.nominalCm} value={item.nominalCm}>{item.nominalCm} cm</option>)}</select></label>
      <label><input type="checkbox" checked={specialWidthEnabled} onChange={(event) => setSpecialWidthEnabled(event.target.checked)} /> Ancho especial</label>
      {specialWidthEnabled && <label>Ancho real del vidrio (mm) <input type="number" min="297" max="1197" step="0.1" value={specialWidthMm} onChange={(event) => setSpecialWidthMm(Number(event.target.value))} /></label>}
      <label><input type="checkbox" checked={specialHeightEnabled} onChange={(event) => setSpecialHeightEnabled(event.target.checked)} /> Altura especial</label>
      {specialHeightEnabled && <label>Altura del proyecto (mm) <input type="number" min="2040" max="2800" step="0.1" value={specialHeightMm} onChange={(event) => setSpecialHeightMm(Number(event.target.value))} /></label>}
      <div>Se factura con el SKU comercial del nominal superior; la medida especial queda identificada en el BOM.</div>
      <button type="button" disabled={readOnly || shape !== 'LINE' || (!specialWidthEnabled && !specialHeightEnabled) || !specialSize.valid || specialSize.projectHeightMm > 2800} onClick={async () => {
        const result = await onCreate?.({
          shape: 'LINE', requestedWidthMm: specialWidthEnabled ? specialWidthMm : specialNominalWidthCm * 10,
          heightMm: specialSize.projectHeightMm,
          panelWidthsMm: [specialSize.nominalWidthCm * 10],
          specialPanel: { nominalWidthCm: specialNominalWidthCm, nominalHeightCm: heightMm / 10, realWidthMm: specialWidthEnabled ? specialWidthMm : null, projectHeightMm: specialHeightEnabled ? specialHeightMm : null },
        });
        setCreatedMeasurement(result?.object?.userData?.measurement || null);
      }}>Crear Línea especial</button>
    </div>}
    {searched && !plan.success && <p>La medida está fuera de los límites disponibles.</p>}
    {searched && plan.success && !plan.compositions.length && <p>No hay una composición nominal para esa medida.</p>}
    {createdMeasurement && <p>Medida real del modelo provisional: {createdMeasurement.widthMm.toFixed(1)} × {createdMeasurement.heightMm.toFixed(1)} mm. Diferencia: {(createdMeasurement.widthMm - Number(requestedWidthMm)).toFixed(1)} mm. Puede cambiar al definir los encajes comerciales.</p>}
    {searched && plan.compositions.map((item) => <div key={item.id} style={{ border: '1px solid #ddd', padding: 8 }}>
      <div>{item.panelWidthsMm.join(' + ')} mm</div>
      <div>Medida solicitada: {item.requestedWidthMm} mm</div>
      <div>Medida nominal: {item.nominalWidthMm} mm</div>
      <div>Diferencia nominal: {item.nominalDifferenceMm} mm</div>
      <div>Vidrio total: {item.glassWidthSumMm} mm</div>
      <div>Medida real: pendiente de verificar en el armado</div>
      {shape !== 'LINE' && <div>{shape === 'T' ? 'Derivación nominal' : 'Segundo brazo nominal'}: {returnPlan?.compositions?.[0]?.nominalWidthMm ?? 'No disponible'} mm</div>}
      <button type="button" disabled={readOnly || (shape !== 'LINE' && !returnPlan?.compositions?.length)} onClick={async () => {
        const result = await onCreate?.({ requestedWidthMm: item.requestedWidthMm, heightMm: item.heightMm, panelWidthsMm: item.panelWidthsMm, shape, returnWidthMm: shape !== 'LINE' ? returnWidthMm : null, returnPanelWidthsMm: shape !== 'LINE' ? returnPlan.compositions[0].panelWidthsMm : null });
        setCreatedMeasurement(result?.object?.userData?.measurement || null);
      }}>Crear {shape === 'LINE' ? 'Línea' : shape}</button>
    </div>)}
  </section>;
}
