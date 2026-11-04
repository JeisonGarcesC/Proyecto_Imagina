import { useRef, useState } from 'react';
import PickListEditor from './PickListEditor.jsx';
import { parsePickListCsv, parsePickListJson, parsePickListXml } from './pickListParser.js';
import { generatePickListTemplate } from './pickListTemplates.js';

export default function PickListPanel({ items, tipologias = [], catalogByCode, country = 'CO', onAdd, onUpdate, onRemove, onImport, readOnly }) {
  const xmlRef = useRef(null);
  const jsonRef = useRef(null);
  const csvRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [report, setReport] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const importFile = async (event, kind) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const rows = kind === 'xml' ? parsePickListXml(text) : kind === 'csv' ? parsePickListCsv(text) : parsePickListJson(text);
      setReport(onImport(rows));
    } catch (error) { setReport({ error: error.message }); }
  };
  const selected = items.find((item) => item.id === editingId) || null;
  const downloadTemplate = (format) => {
    const mime = format === 'json' ? 'application/json' : format === 'xml' ? 'application/xml' : 'text/csv';
    const prefix = format === 'csv' ? '\uFEFF' : '';
    const url = URL.createObjectURL(new Blob([prefix, generatePickListTemplate(format, tipologias[0] || null)], { type: `${mime};charset=utf-8` }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `picklist-ejemplo.${format}`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>🧾 PickList</h3>
      <div>Importar archivo</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" disabled={readOnly} onClick={() => csvRef.current?.click()}>Seleccionar CSV</button>
        <button type="button" disabled={readOnly} onClick={() => xmlRef.current?.click()}>Seleccionar XML</button>
        <button type="button" disabled={readOnly} onClick={() => jsonRef.current?.click()}>Seleccionar JSON</button>
        <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => importFile(event, 'csv')} />
        <input ref={xmlRef} type="file" accept=".xml,text/xml,application/xml" hidden onChange={(event) => importFile(event, 'xml')} />
        <input ref={jsonRef} type="file" accept=".json,application/json" hidden onChange={(event) => importFile(event, 'json')} />
      </div>
      <button type="button" onClick={() => setShowTemplates((value) => !value)}>📥 Descargar formatos</button>
      {showTemplates && <div style={{ display: 'grid', gap: 5 }}>
        {['csv', 'json', 'xml'].map((format) => <button key={format} type="button" onClick={() => downloadTemplate(format)}>
          📄 Descargar plantilla {format.toUpperCase()}
        </button>)}
      </div>}
      <div>Códigos cargados: {items.length}</div>
      {!readOnly && <button type="button" onClick={() => { setEditingId(null); setOpenForm(true); }}>Agregar manualmente</button>}
      {report && <div role="status" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
        {report.error ? report.error : `Importación completada\n${report.found} códigos encontrados\n${report.accepted.length} agregados (${report.accepted.filter((item) => item.tipologiaKey).length} con tipología, ${report.accepted.filter((item) => !item.tipologiaKey).length} sin tipología)\n${report.rejected.length} rechazados${report.rejected.length ? `\nFilas con error:\n${report.rejected.map((error) => `- ${error}`).join('\n')}` : ''}${report.warnings?.length ? `\nAdvertencias:\n${report.warnings.map((warning) => `- ${warning}`).join('\n')}` : ''}`}
      </div>}
      {openForm && !readOnly && <PickListEditor item={selected} tipologias={tipologias} catalogByCode={catalogByCode} country={country} title={selected ? 'Editar código' : 'Agregar código manual'} onCancel={() => setOpenForm(false)} onSave={(form) => {
        if (selected) onUpdate(selected.id, form); else onAdd(form);
        setOpenForm(false);
      }} />}
      <div style={{ display: 'grid', gap: 7, maxHeight: 350, overflowY: 'auto' }}>
        {items.map((item) => <div key={item.id} style={{ padding: 8, border: '1px solid #e0e0e0', borderRadius: 7, background: '#fff', fontSize: 12 }}>
          <strong>{item.codigo}</strong> · {item.descripcion}<br />
          Cant. {item.cantidad} · {item.precio == null ? 'Precio no disponible' : item.precio} · {item.tipologiaKey ? `Tipología - ${item.tipologiaKey}` : 'PICKLIST'}
          {!readOnly && <div style={{ display: 'flex', gap: 7, marginTop: 6 }}>
            <button type="button" onClick={() => { setEditingId(item.id); setOpenForm(true); }}>Editar</button>
            <button type="button" onClick={() => onRemove(item.id)}>Eliminar</button>
          </div>}
        </div>)}
      </div>
    </section>
  );
}
