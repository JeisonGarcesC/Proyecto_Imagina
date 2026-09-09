import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

const ACCEPT = '.glb,.gltf,.stl,.obj,.dxf,.dwg,model/gltf-binary,model/gltf+json';

const ImportedModelUploader = forwardRef(function ImportedModelUploader(
  { disabled = false, onImport },
  ref
) {
  const inputRef = useRef(null);
  const [unit, setUnit] = useState('mm');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useImperativeHandle(ref, () => ({ open: () => inputRef.current?.click() }), []);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

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
      {message ? <div style={{ fontSize: 12, lineHeight: 1.4 }}>{message}</div> : null}
    </div>
  );
});

export default ImportedModelUploader;
