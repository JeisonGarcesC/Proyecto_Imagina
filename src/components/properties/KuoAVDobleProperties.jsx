// src/components/properties/KuoAVDobleProperties.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Editor de propiedades lateral para PUESTO DOBLE KUO AV.
// Permite modificar paramétricamente:
// - Dimensiones (Ancho, Profundidad, Altura, Espesor)
// - Configuración Bench / Extensión CET (Inicial, Extensión Der/Izq, Intermedio)
// - Acabados independientes por pieza (Superficies F/P, Parales, Estructura, Grommet)
// - Opciones de electrificación y accesorios
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { sectionStyle } from './shared/PropertyStyles';

export function isKuoAVDobleEditablePart(part) {
  if (!part) return false;
  const instId = String(part.instanceId || part.userData?.instanceId || '');
  const parentAssId = String(part.parentAssemblyId || part.userData?.parentAssemblyId || '');
  const kind = String(part.kind || part.userData?.kind || part.parent?.userData?.kind || '');

  return (
    kind === 'KUO_AV_DOBLE_ASSEMBLY' ||
    instId.startsWith('KUOAVD_') ||
    parentAssId.startsWith('KUOAVD_')
  );
}

export default function KuoAVDobleProperties({ part, api }) {
  if (!isKuoAVDobleEditablePart(part)) return null;

  const parentAssemblyId = part?.userData?.parentAssemblyId || part?.parentAssemblyId;
  const rootPart =
    part?.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY'
      ? part
      : part?.parent?.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY'
      ? part.parent
      : part;

  const currentConfig = rootPart?.userData?.config || part?.userData?.config || part?.config || {};
  const instanceId = parentAssemblyId || rootPart?.userData?.instanceId || part?.userData?.instanceId;

  const [anchoMm, setAnchoMm] = useState(currentConfig.anchoMm || 1200);
  const [profundidadMm, setProfundidadMm] = useState(currentConfig.profundidadMm || 600);
  const [alturaMm, setAlturaMm] = useState(currentConfig.alturaMm || 730);
  const [thickMm, setThickMm] = useState(currentConfig.thickMm || 30);

  const [pieIzquierdo, setPieIzquierdo] = useState(currentConfig.pieIzquierdo !== undefined ? !!currentConfig.pieIzquierdo : true);
  const [pieDerecho, setPieDerecho] = useState(currentConfig.pieDerecho !== undefined ? !!currentConfig.pieDerecho : true);
  const [espesorTipo, setEspesorTipo] = useState(currentConfig.espesorTipo || 'Formica 30');
  const [acabadoSuperficieF, setAcabadoSuperficieF] = useState(currentConfig.acabadoSuperficieF || '#dedede');
  const [acabadoSuperficieP, setAcabadoSuperficieP] = useState(currentConfig.acabadoSuperficieP || '#dedede');
  const [acabadoParales, setAcabadoParales] = useState(currentConfig.acabadoParales || 'Blanco');
  const [acabadoEstructura, setAcabadoEstructura] = useState(currentConfig.acabadoEstructura || 'Blanco');
  const [kitFuenteColor, setKitFuenteColor] = useState(currentConfig.kitFuenteColor || 'Blanco');
  const [kitFuente, setKitFuente] = useState(currentConfig.kitFuente !== undefined ? !!currentConfig.kitFuente : true);
  const [elevarKitFIzquierdo, setElevarKitFIzquierdo] = useState(!!currentConfig.elevarKitFIzquierdo);
  const [acabadoGrommet, setAcabadoGrommet] = useState(currentConfig.acabadoGrommet || 'Anodizado');
  const [especial, setEspecial] = useState(!!currentConfig.especial);
  const [baldosaFormica, setBaldosaFormica] = useState(!!currentConfig.baldosaFormica);
  const [costadoIntermedio, setCostadoIntermedio] = useState(currentConfig.costadoIntermedio !== undefined ? !!currentConfig.costadoIntermedio : true);
  const legacyVertebraEnabled =
    currentConfig.vertebraLateral !== undefined ? !!currentConfig.vertebraLateral : true;
  const [vertebraLeftEnabled, setVertebraLeftEnabled] = useState(
    currentConfig.vertebraLeftEnabled !== undefined
      ? !!currentConfig.vertebraLeftEnabled
      : legacyVertebraEnabled
  );
  const [vertebraRightEnabled, setVertebraRightEnabled] = useState(
    currentConfig.vertebraRightEnabled !== undefined
      ? !!currentConfig.vertebraRightEnabled
      : legacyVertebraEnabled
  );

  // Pantalla Formica / Melamina / Tela
  const [pantalla, setPantalla] = useState(!!currentConfig.pantalla || !!currentConfig.pantallaEnabled);
  const [pantallaPosicion, setPantallaPosicion] = useState(currentConfig.pantallaPosicion || 'CENTRAL');
  const [pantallaTipo, setPantallaTipo] = useState(currentConfig.pantallaTipo || 'FORMICA');
  const [pantallaAcabado, setPantallaAcabado] = useState(currentConfig.pantallaAcabado || '#dedede');

  useEffect(() => {
    const cfg = rootPart?.userData?.config || {};
    if (cfg.anchoMm) setAnchoMm(cfg.anchoMm);
    if (cfg.profundidadMm) setProfundidadMm(cfg.profundidadMm);
    if (cfg.alturaMm) setAlturaMm(cfg.alturaMm);
    if (cfg.thickMm) setThickMm(cfg.thickMm);
    if (cfg.pieIzquierdo !== undefined) setPieIzquierdo(cfg.pieIzquierdo);
    if (cfg.pieDerecho !== undefined) setPieDerecho(cfg.pieDerecho);
    if (cfg.espesorTipo) setEspesorTipo(cfg.espesorTipo);
    if (cfg.acabadoSuperficieF) setAcabadoSuperficieF(cfg.acabadoSuperficieF);
    if (cfg.acabadoSuperficieP) setAcabadoSuperficieP(cfg.acabadoSuperficieP);
    if (cfg.acabadoParales) setAcabadoParales(cfg.acabadoParales);
    if (cfg.acabadoEstructura) setAcabadoEstructura(cfg.acabadoEstructura);
    if (cfg.kitFuenteColor) setKitFuenteColor(cfg.kitFuenteColor);
    if (cfg.kitFuente !== undefined) setKitFuente(cfg.kitFuente);
    if (cfg.elevarKitFIzquierdo !== undefined) setElevarKitFIzquierdo(cfg.elevarKitFIzquierdo);
    if (cfg.acabadoGrommet) setAcabadoGrommet(cfg.acabadoGrommet);
    if (cfg.especial !== undefined) setEspecial(cfg.especial);
    if (cfg.baldosaFormica !== undefined) setBaldosaFormica(cfg.baldosaFormica);
    if (cfg.costadoIntermedio !== undefined) setCostadoIntermedio(cfg.costadoIntermedio);
    if (cfg.vertebraLeftEnabled !== undefined) {
      setVertebraLeftEnabled(cfg.vertebraLeftEnabled);
    } else if (cfg.vertebraLateral !== undefined) {
      setVertebraLeftEnabled(cfg.vertebraLateral);
    }
    if (cfg.vertebraRightEnabled !== undefined) {
      setVertebraRightEnabled(cfg.vertebraRightEnabled);
    } else if (cfg.vertebraLateral !== undefined) {
      setVertebraRightEnabled(cfg.vertebraLateral);
    }
    if (cfg.pantalla !== undefined || cfg.pantallaEnabled !== undefined) {
      setPantalla(!!cfg.pantalla || !!cfg.pantallaEnabled);
    }
    if (cfg.pantallaPosicion) setPantallaPosicion(cfg.pantallaPosicion);
    if (cfg.pantallaTipo) setPantallaTipo(cfg.pantallaTipo);
    if (cfg.pantallaAcabado) setPantallaAcabado(cfg.pantallaAcabado);
  }, [instanceId, rootPart?.userData?.config]);

  async function updateConfig(changes) {
    const nextCfg = {
      anchoMm,
      profundidadMm,
      alturaMm,
      thickMm,
      pieIzquierdo,
      pieDerecho,
      paralesIzquierdos: pieIzquierdo,
      paralesDerechos: pieDerecho,
      espesorTipo,
      acabadoSuperficieF,
      acabadoSuperficieP,
      acabadoParales,
      acabadoEstructura,
      kitFuenteColor,
      kitFuente,
      elevarKitFIzquierdo,
      acabadoGrommet,
      especial,
      baldosaFormica,
      costadoIntermedio,
      vertebraLeftEnabled,
      vertebraRightEnabled,
      pantalla,
      pantallaPosicion,
      pantallaTipo,
      pantallaAcabado,
      ...changes,
    };

    console.log('[KUO DOUBLE PARAM] updateConfig', { instanceId, changes, nextCfg });

    if (api?.swapKuoAVDobleVariant && instanceId) {
      await api.swapKuoAVDobleVariant(instanceId, nextCfg);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', borderBottom: '1px solid #eee', paddingBottom: 6 }}>
        Puesto Doble KUO AV
      </div>

      {/* ESTRUCTURA LATERAL / CONTINUIDAD EN L */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#333' }}>Estructura Lateral</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#666' }}>Lateral Izquierdo (Pie y Parales)</span>
          <input
            type="checkbox"
            checked={pieIzquierdo}
            onChange={(e) => {
              const val = e.target.checked;
              setPieIzquierdo(val);
              updateConfig({ pieIzquierdo: val, paralesIzquierdos: val });
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#666' }}>Lateral Derecho (Pie y Parales)</span>
          <input
            type="checkbox"
            checked={pieDerecho}
            onChange={(e) => {
              const val = e.target.checked;
              setPieDerecho(val);
              updateConfig({ pieDerecho: val, paralesDerechos: val });
            }}
          />
        </div>
      </div>

      {/* DIMENSIONES */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#333' }}>Dimensiones</div>
        
        {/* Ancho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#666' }}>Ancho (mm)</span>
          <select
            value={anchoMm}
            onChange={(e) => {
              const val = Number(e.target.value);
              setAnchoMm(val);
              updateConfig({ anchoMm: val });
            }}
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value={1200}>1200 mm</option>
            <option value={1500}>1500 mm</option>
            <option value={1650}>1650 mm</option>
          </select>
        </div>

        {/* Profundidad por lado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#666' }}>Profundidad (mm)</span>
          <select
            value={profundidadMm}
            onChange={(e) => {
              const val = Number(e.target.value);
              setProfundidadMm(val);
              updateConfig({ profundidadMm: val });
            }}
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value={600}>600 mm (Total 1200)</option>
            <option value={750}>750 mm (Total 1500)</option>
          </select>
        </div>

        {/* Altura */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#666' }}>Altura (mm)</span>
          <select
            value={alturaMm}
            onChange={(e) => {
              const val = Number(e.target.value);
              setAlturaMm(val);
              updateConfig({ alturaMm: val });
            }}
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value={730}>730 mm</option>
            <option value={750}>750 mm</option>
          </select>
        </div>

        {/* Espesor */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#666' }}>Espesor (mm)</span>
          <select
            value={thickMm}
            onChange={(e) => {
              const val = Number(e.target.value);
              setThickMm(val);
              updateConfig({ thickMm: val });
            }}
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value={18}>18 mm</option>
            <option value={25}>25 mm</option>
            <option value={30}>30 mm</option>
          </select>
        </div>
      </div>

      {/* ACABADOS INDEPENDIENTES */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#333' }}>Acabados por Pieza</div>
        
        {/* Superficie Frontal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#666' }}>Superficie Frontal</span>
          <select
            value={acabadoSuperficieF}
            onChange={(e) => {
              const val = e.target.value;
              setAcabadoSuperficieF(val);
              updateConfig({ acabadoSuperficieF: val });
            }}
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="#dedede">Blanco Seda</option>
            <option value="#c2b280">Roble Natural</option>
            <option value="#707070">Gris Ceniza</option>
            <option value="#2a2a2a">Grafito</option>
          </select>
        </div>

        {/* Superficie Posterior */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#666' }}>Superficie Posterior</span>
          <select
            value={acabadoSuperficieP}
            onChange={(e) => {
              const val = e.target.value;
              setAcabadoSuperficieP(val);
              updateConfig({ acabadoSuperficieP: val });
            }}
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="#dedede">Blanco Seda</option>
            <option value="#c2b280">Roble Natural</option>
            <option value="#707070">Gris Ceniza</option>
            <option value="#2a2a2a">Grafito</option>
          </select>
        </div>

        {/* Parales Linak */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#666' }}>Parales Linak</span>
          <select
            value={acabadoParales}
            onChange={(e) => {
              const val = e.target.value;
              setAcabadoParales(val);
              updateConfig({ acabadoParales: val });
            }}
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="Blanco">Blanco</option>
            <option value="Gris">Gris</option>
            <option value="Negro">Negro</option>
          </select>
        </div>

        {/* Estructura y Pies */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#666' }}>Estructura y Pies</span>
          <select
            value={acabadoEstructura}
            onChange={(e) => {
              const val = e.target.value;
              setAcabadoEstructura(val);
              updateConfig({ acabadoEstructura: val });
            }}
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="Blanco">Blanco</option>
            <option value="Gris">Gris</option>
            <option value="Negro">Negro</option>
          </select>
        </div>

        {/* Acabado Grommet */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#666' }}>Acabado Grommet</span>
          <select
            value={acabadoGrommet}
            onChange={(e) => {
              const val = e.target.value;
              setAcabadoGrommet(val);
              updateConfig({ acabadoGrommet: val });
            }}
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="Anodizado">Anodizado</option>
            <option value="Blanco">Blanco</option>
            <option value="Negro">Negro</option>
            <option value="Gris">Gris</option>
          </select>
        </div>
      </div>

      {/* PANTALLA DIVISORIA (FORMICA / MELAMINA / TELA) */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#333' }}>
          Pantalla Formica / Melamina / Tela
        </div>

        {/* Incluir Pantalla */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer', marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={pantalla}
            onChange={(e) => {
              const val = e.target.checked;
              setPantalla(val);
              updateConfig({ pantalla: val, pantallaEnabled: val });
            }}
          />
          <span style={{ fontWeight: 600 }}>Incluir Pantalla</span>
        </label>

        {pantalla && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 4 }}>
            {/* Posición de la Pantalla */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#666' }}>Posición</span>
              <select
                value={pantallaPosicion}
                onChange={(e) => {
                  const val = e.target.value;
                  setPantallaPosicion(val);
                  updateConfig({ pantallaPosicion: val });
                }}
                style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc' }}
              >
                <option value="CENTRAL">Central (Entre superficies)</option>
                <option value="POSTERIOR">Posterior (Atrás)</option>
                <option value="FRONTAL">Frontal (Adelante)</option>
              </select>
            </div>

            {/* Material / Tipo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#666' }}>Material</span>
              <select
                value={pantallaTipo}
                onChange={(e) => {
                  const val = e.target.value;
                  setPantallaTipo(val);
                  updateConfig({ pantallaTipo: val });
                }}
                style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc' }}
              >
                <option value="FORMICA">Formica (KUAC690000)</option>
                <option value="MELAMINA">Melamínico (KUAC700000)</option>
                <option value="TELA">Tela Acústica (KUAC670000)</option>
                <option value="VIDRIO">Vidrio Laminado (KUAC660000)</option>
              </select>
            </div>

            {/* Acabado Pantalla */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#666' }}>Acabado</span>
              <select
                value={pantallaAcabado}
                onChange={(e) => {
                  const val = e.target.value;
                  setPantallaAcabado(val);
                  updateConfig({ pantallaAcabado: val });
                }}
                style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc' }}
              >
                <option value="#dedede">Blanco Seda</option>
                <option value="#c2b280">Roble Natural</option>
                <option value="#707070">Gris Ceniza</option>
                <option value="#2a2a2a">Grafito</option>
                <option value="#1e3a8a">Azul Marino</option>
                <option value="#3f3f46">Antracita</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* COMPONENTES OPCIONALES */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#333' }}>Opciones</div>
        
        {/* Baldosa Formica */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer', marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={baldosaFormica}
            onChange={(e) => {
              const val = e.target.checked;
              setBaldosaFormica(val);
              updateConfig({ baldosaFormica: val });
            }}
          />
          Baldosa Formica
        </label>

        {/* Kit Fuente */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer', marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={kitFuente}
            onChange={(e) => {
              const val = e.target.checked;
              setKitFuente(val);
              updateConfig({ kitFuente: val });
            }}
          />
          Kit Fuente Central
        </label>

        {/* Vértebras independientes */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={vertebraLeftEnabled}
            onChange={(e) => {
              const val = e.target.checked;
              setVertebraLeftEnabled(val);
              updateConfig({ vertebraLeftEnabled: val });
            }}
          />
          Vértebra Izquierda / Frontal
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={vertebraRightEnabled}
            onChange={(e) => {
              const val = e.target.checked;
              setVertebraRightEnabled(val);
              updateConfig({ vertebraRightEnabled: val });
            }}
          />
          Vértebra Derecha / Posterior
        </label>
      </div>
    </div>
  );
}
