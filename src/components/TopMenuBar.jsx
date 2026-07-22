// src/components/TopMenuBar.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import './TopMenuBar.css';

function moneyCOP(v) {
  const n = Number(v || 0);
  return n.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}

export default function TopMenuBar({
  user,
  perms,
  country,
  setCountry,
  catalogCountries = [],
  materialsByCode,
  threeApiRef,
  transformTool = 'move',
  onTransformToolChange,
  moveAsGroup = false,
  onMoveAsGroupChange,
  onLogout,
  onNewProject,
  debugSaveAlert = false,
  onOpenBom,
  onCloseBom,
  bomOpen = false,
  bomTotal = 0,
  onExportSvg,
  onExportPng,
  onExportPdf,
  onExportGlb,
  onExportDxf,
}) {
  const [open, setOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState('single');
  const fileRef = useRef(null);
  const barRef = useRef(null);

  const canLoadSave = !!perms?.canLoadSave;

  const bomShowText = bomOpen ? 'Cerrar Inventario (BOM)' : 'Abrir Inventario (BOM)';

  const doExportGlb = () => {
    onExportGlb?.();
    setOpen(false);
    setExportOpen(false);
  };

  const doExportDxf = () => {
    onExportDxf?.();
    setOpen(false);
    setExportOpen(false);
  };

  const labelUser = useMemo(() => {
    const ses = user?.label || user?.role || '—';
    const u = user?.username || '';
    return u ? `${ses} · ${u}` : ses;
  }, [user]);

  useEffect(() => {
    const onMouseDown = (e) => {
      if (!barRef.current?.contains(e.target)) {
        setOpen(false);
        setExportOpen(false);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setExportOpen(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const doSave = () => {
    const data = threeApiRef.current?.exportProject?.();
    if (!data) return;

    if (debugSaveAlert) {
      alert(
        JSON.stringify(
          {
            firstPartKeys: Object.keys(data.parts?.[0] || {}),
            firstFinishes: data.parts?.[0]?.finishes || null,
            finishesCount: data.parts?.[0]?.finishes
              ? Object.keys(data.parts[0].finishes).length
              : 0,
          },
          null,
          2
        )
      );
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'proyecto-imagina.json';
    a.click();
  };

  const doOpen = () => {
    if (!canLoadSave) return;
    fileRef.current?.click();
  };

  const onPickFile = async (e) => {
    try {
      if (!canLoadSave) return;

      const file = e.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      const json = JSON.parse(text);

      if (!materialsByCode || materialsByCode.size === 0) {
        alert('Aún no se han cargado los materiales. Espera un momento y vuelve a intentar.');
        return;
      }

      threeApiRef.current?.loadProject?.(json);
    } catch (err) {
      console.error('Error cargando JSON:', err);
      alert('No pude cargar el proyecto. Revisa que sea un JSON válido.');
    } finally {
      e.target.value = '';
      setOpen(false);
      setExportOpen(false);
    }
  };

  const doNew = () => {
    if (!canLoadSave) return;
    onNewProject?.();
    setOpen(false);
    setExportOpen(false);
  };

  const doExit = () => {
    setOpen(false);
    setExportOpen(false);
    onLogout?.();
  };

  const doExportSvg = () => {
    onExportSvg?.();
    setOpen(false);
    setExportOpen(false);
  };

  const doExportPng = () => {
    onExportPng?.();
    setOpen(false);
    setExportOpen(false);
  };

  const doExportPdf = () => {
    onExportPdf?.();
    setOpen(false);
    setExportOpen(false);
  };

  const handleMoveMode = (mode) => {
    const asGroup = mode === 'group';
    onMoveAsGroupChange?.(asGroup);
  };

  const handleDeleteMode = (mode) => {
    const asGroup = mode === 'group';
    threeApiRef.current?.setDeleteAsGroup?.(asGroup);
    setDeleteMode(mode);
  };

  return (
    <header ref={barRef} className="topbar-shell">
      <div className="topbar-left">
        <div className="topbar-menu-wrap">
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setExportOpen(false);
          }}
            className={`topbar-file-btn ${open ? 'is-open' : ''}`}
        >
          Archivo
        </button>

        {open && (
          <div className="topbar-menu-panel">
            <MenuItem label="Nuevo" disabled={!canLoadSave} onClick={doNew} />
            <MenuItem label="Abrir..." disabled={!canLoadSave} onClick={doOpen} />
            <MenuItem label="Guardar" disabled={!canLoadSave} onClick={doSave} />

            <div className="topbar-submenu-wrap">
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                className={`topbar-menu-item ${exportOpen ? 'is-open' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
              >
                Exportar
                <span className="topbar-submenu-caret">›</span>
              </button>

              {exportOpen && (
                <div className="topbar-submenu-panel">
                  <MenuItem label="Exportar GLB" onClick={doExportGlb} />
                  <MenuItem label="Exportar DXF" onClick={doExportDxf} />

                  <div className="topbar-divider" />

                  <MenuItem label="Exportar SVG" onClick={doExportSvg} />
                  <MenuItem label="Exportar PNG" onClick={doExportPng} />
                  <MenuItem label="Exportar PDF" onClick={doExportPdf} />

                  <div className="topbar-menu-help">
                    PDF abre la ventana de impresión. GLB exporta el modelo 3D limpio del proyecto.
                  </div>
                </div>
              )}
            </div>

            <div className="topbar-divider" />
            <MenuItem label="Salir" onClick={doExit} />
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={onPickFile}
          disabled={!canLoadSave}
        />
        </div>

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
            className="topbar-country"
        >
          {catalogCountries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="topbar-center">
        <div className="topbar-control-group">
          <span className="topbar-group-title">Herramienta</span>
          <div className="topbar-segmented">
            <button
              type="button"
              className={`topbar-segment ${transformTool === 'move' ? 'is-active' : ''}`}
              onClick={() => onTransformToolChange?.('move')}
            >
              Mover
            </button>
            <button
              type="button"
              className={`topbar-segment ${transformTool === 'rotate' ? 'is-active' : ''}`}
              onClick={() => onTransformToolChange?.('rotate')}
            >
              Rotar
            </button>
            <button type="button" className="topbar-segment" onClick={() => threeApiRef.current?.rotateByDegrees?.({ degrees: -90 })}>
              −90°
            </button>
            <button type="button" className="topbar-segment" onClick={() => threeApiRef.current?.rotateByDegrees?.({ degrees: 90 })}>
              +90°
            </button>
          </div>
        </div>

        <div className="topbar-control-group">
          <span className="topbar-group-title">Alcance</span>
          <div className="topbar-segmented">
            <button
              type="button"
              className={`topbar-segment ${moveAsGroup ? 'is-active' : ''}`}
              onClick={() => handleMoveMode('group')}
            >
              Puesto completo
            </button>
            <button
              type="button"
              className={`topbar-segment ${!moveAsGroup ? 'is-active' : ''}`}
              onClick={() => handleMoveMode('single')}
            >
              Pieza individual
            </button>
          </div>
        </div>

        <div className="topbar-control-group">
          <span className="topbar-group-title">Eliminar</span>
          <div className="topbar-segmented">
            <button
              type="button"
              className={`topbar-segment ${deleteMode === 'group' ? 'is-active' : ''}`}
              onClick={() => handleDeleteMode('group')}
            >
              Puesto completo
            </button>
            <button
              type="button"
              className={`topbar-segment ${deleteMode === 'single' ? 'is-active' : ''}`}
              onClick={() => handleDeleteMode('single')}
            >
              Pieza individual
            </button>
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <span className="topbar-user">{labelUser}</span>
        <button
          type="button"
          onClick={bomOpen ? onCloseBom : onOpenBom}
          className="topbar-bom-btn"
        >
          <span>{bomShowText}</span>
          <span className="topbar-bom-sep" />
          <strong>{moneyCOP(bomTotal)}</strong>
        </button>
      </div>
    </header>
  );
}

function MenuItem({ label, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="topbar-menu-item"
      style={{ opacity: disabled ? 0.45 : 1 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}
