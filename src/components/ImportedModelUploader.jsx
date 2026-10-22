import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { parseXmlBom } from '../importers/xmlBomImporter.js';

const ACCEPT = '.glb,.gltf,.stl,.obj,.dxf,.dwg,model/gltf-binary,model/gltf+json';
const LARGE_FILE_NOTICE_SIZE = 35 * 1024 * 1024;

function formatFileSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

const ImportedModelUploader = forwardRef(function ImportedModelUploader(
  { disabled = false, onImport, onImportXmlBom, xmlBomCatalog },
  ref
) {
  const inputRef = useRef(null);
  const [unit, setUnit] = useState('mm');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [xmlName, setXmlName] = useState('');
  const [xmlFile, setXmlFile] = useState(null);
  const [xmlPreview, setXmlPreview] = useState(null);
  const [xmlMessage, setXmlMessage] = useState('');

  useEffect(() => {
    if (!xmlFile || !xmlName.trim()) return;
    let active = true;
    xmlFile.text().then((text) => {
      const parsed = parseXmlBom(text, xmlName);
      if (active) { setXmlPreview(parsed); setXmlMessage(''); }
    }).catch((error) => {
      if (active) { setXmlPreview(null); setXmlMessage(error.message); }
    });
    return () => { active = false; };
  }, [xmlFile, xmlName]);

  useImperativeHandle(ref, () => ({ open: () => inputRef.current?.click() }), []);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setSelectedFile({ name: file.name, size: file.size });

    if (file.name.toLowerCase().endsWith('.dwg')) {
      setMessage('DWG requiere conversión previa: usa STLOUT para 3D o SAVEAS DXF para 2D.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      await onImport?.(file, { unit });
      setMessage(`${file.name} se agregó al proyecto.`);
    } catch (error) {
      console.error('No se pudo importar el objeto:', error);
      setMessage(error?.message || 'No se pudo importar el objeto.');
    } finally {
      setBusy(false);
    }
  };

  const handleXmlFile = async (event) => {
    const file = event.target.files?.[0];
    setXmlFile(file || null);
    setXmlPreview(null);
    setXmlMessage('');
    if (!file) return;
    try {
      if (!/\.xml$/i.test(file.name)) throw new Error('Selecciona un archivo .xml.');
      const parsed = parseXmlBom(await file.text(), xmlName);
      setXmlPreview(parsed);
    } catch (error) { setXmlMessage(error.message); }
  };

  const importXml = async () => {
    try {
      if (!xmlFile) throw new Error('Selecciona un archivo XML.');
      const parsed = parseXmlBom(await xmlFile.text(), xmlName);
      await onImportXmlBom?.(parsed);
      setXmlPreview(parsed);
      setXmlMessage(`Se importaron ${parsed.recordCount} registros al BOM.`);
    } catch (error) { setXmlMessage(error.message); }
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <label style={{ display: 'grid', gap: 5, fontSize: 12 }}>
        Unidad del archivo
        <select
          value={unit}
          disabled={disabled || busy}
          onChange={(event) => setUnit(event.target.value)}
          style={{ padding: 9, borderRadius: 8, border: '1px solid #d8d8d8' }}
        >
          <option value="mm">Milímetros</option>
          <option value="cm">Centímetros</option>
          <option value="m">Metros</option>
        </select>
      </label>

      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        style={{ padding: 10, borderRadius: 9, border: '1px solid #b9b9b9', fontWeight: 700 }}
      >
        {busy ? 'Importando…' : 'Seleccionar objeto'}
      </button>
      <input ref={inputRef} hidden type="file" accept={ACCEPT} onChange={handleFile} />

      <div style={{ fontSize: 11, opacity: 0.72, lineHeight: 1.45 }}>
        Formatos: GLB, GLTF embebido, STL, OBJ y DXF. Para GLB/GLTF se respetan metros;
        la unidad elegida se usa en STL, OBJ y DXF.
      </div>
      {selectedFile ? (
        <div style={{ fontSize: 12, lineHeight: 1.4 }}>
          {selectedFile.name} · {formatFileSize(selectedFile.size)}
          {busy && selectedFile.size >= LARGE_FILE_NOTICE_SIZE
            ? ' — Archivo grande; la importación puede tardar y consumir bastante memoria.'
            : ''}
        </div>
      ) : null}
      {message ? <div style={{ fontSize: 12, lineHeight: 1.4 }}>{message}</div> : null}
      <section style={{ borderTop: '1px solid #ddd', paddingTop: 12, display: 'grid', gap: 8 }}>
        <strong style={{ fontSize: 13 }}>Importar información comercial (XML)</strong>
        <label style={{ fontSize: 12 }}>Nombre del proyecto
          <input value={xmlName} disabled={disabled} onChange={(event) => {
            setXmlName(event.target.value); setXmlPreview(null); setXmlMessage('');
          }} placeholder="Nombre del proyecto" style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 8 }} />
        </label>
        <input type="file" accept=".xml,application/xml,text/xml" disabled={disabled}
          onChange={handleXmlFile} />
        {xmlFile && <div style={{ fontSize: 12 }}>Archivo: {xmlFile.name}</div>}
        {xmlPreview && <div style={{ fontSize: 12 }}>
          Proyecto: {xmlPreview.name}<br />Registros: {xmlPreview.recordCount}<br />
          Códigos únicos: {xmlPreview.lines.length}<br />
          Códigos no encontrados en catálogo: {xmlPreview.lines.filter(({ code }) => !xmlBomCatalog?.has?.(code)).length}
        </div>}
        <button type="button" disabled={disabled || !xmlFile || !xmlName.trim()} onClick={importXml}>Importar XML</button>
        {xmlMessage && <div style={{ fontSize: 12 }}>{xmlMessage}</div>}
      </section>
    </div>
  );
});

export default ImportedModelUploader;
