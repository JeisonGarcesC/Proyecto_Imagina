import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { parseXmlBom } from '../importers/xmlBomImporter.js';

const ACCEPT = '.glb,.gltf,.stl,.obj,.dxf,.dwg,model/gltf-binary,model/gltf+json';
const LARGE_FILE_NOTICE_SIZE = 35 * 1024 * 1024;

function formatFileSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatMeters(size) {
  return ['X', 'Y', 'Z'].map((axis, index) =>
    `${axis}: ${Number(size?.[index] || 0).toFixed(2).replace('.', ',')} m`).join(' · ');
}

const ImportedModelUploader = forwardRef(function ImportedModelUploader(
  { disabled = false, onImport, onImportXmlBom, xmlBomCatalog },
  ref
) {
  const inputRef = useRef(null);
  const confirmationRef = useRef(null);
  const cancelConfirmationRef = useRef(null);
  const continueConfirmationRef = useRef(null);
  const [unit, setUnit] = useState('mm');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
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

  useEffect(() => () => {
    confirmationRef.current?.(false);
    confirmationRef.current = null;
  }, []);

  useEffect(() => {
    if (pendingConfirmation) cancelConfirmationRef.current?.focus();
  }, [pendingConfirmation]);

  const requestAmbiguousConfirmation = (details) => new Promise((resolve) => {
    confirmationRef.current = resolve;
    setPendingConfirmation(details);
  });

  const answerConfirmation = (confirmed) => {
    const resolve = confirmationRef.current;
    confirmationRef.current = null;
    setPendingConfirmation(null);
    resolve?.(confirmed);
  };

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
      await onImport?.(file, {
        unit, onStatus: setMessage,
        confirmAmbiguous: (details) => requestAmbiguousConfirmation({ ...details, fileName: file.name }),
      });
      setMessage(`${file.name} se agregó al proyecto.`);
    } catch (error) {
      if (error?.name === 'ImportedModelImportCancelled') setMessage('Importación cancelada.');
      else {
        console.error('No se pudo importar el objeto:', error);
        setMessage(error?.message || 'No se pudo importar el objeto.');
      }
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
      {pendingConfirmation ? createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)',
          display: 'grid', placeItems: 'center', padding: 16 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="import-model-confirm-title"
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Escape') {
                event.preventDefault();
                answerConfirmation(false);
              } else if (event.key === 'Tab') {
                if (event.shiftKey && document.activeElement === cancelConfirmationRef.current) {
                  event.preventDefault();
                  continueConfirmationRef.current?.focus();
                } else if (!event.shiftKey && document.activeElement === continueConfirmationRef.current) {
                  event.preventDefault();
                  cancelConfirmationRef.current?.focus();
                }
              }
            }}
            style={{ width: 'min(520px, 100%)', maxHeight: '90vh', overflowY: 'auto',
              background: '#fff', color: '#222', borderRadius: 12, padding: 22,
              boxShadow: '0 16px 48px rgba(0,0,0,0.3)', display: 'grid', gap: 12 }}>
            <h2 id="import-model-confirm-title" style={{ margin: 0, fontSize: 18 }}>
              Confirmar importación de modelo extenso
            </h2>
            <div><strong>Modelo:</strong> {pendingConfirmation.fileName}</div>
            <div><strong>Dimensiones totales:</strong><br />{formatMeters(pendingConfirmation.totalBounds?.size)}</div>
            <div><strong>Dimensiones validadas:</strong><br />{formatMeters(pendingConfirmation.validatedBounds?.size)}</div>
            <div><strong>Elementos ambiguos:</strong> {pendingConfirmation.ambiguousCount}</div>
            <p style={{ margin: 0 }}>
              El modelo supera el límite general de 1000 m y contiene superficies extensas cuya función no pudo determinarse automáticamente.
            </p>
            <p style={{ margin: 0 }}>
              Si conoce el proyecto y confirma que estas superficies corresponden a elementos de contexto, puede continuar con la importación.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <button ref={cancelConfirmationRef} type="button" onClick={() => answerConfirmation(false)}>Cancelar</button>
              <button ref={continueConfirmationRef} type="button" onClick={() => answerConfirmation(true)}>Continuar e importar</button>
            </div>
          </div>
        </div>, document.body
      ) : null}
    </div>
  );
});

export default ImportedModelUploader;
