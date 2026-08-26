// src/components/properties/KuoAVProperties.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Editor de propiedades flotante/derecho para KUO AV - Superficie Perimetral.
// Permite modificar paramétricamente las opciones de la mesa seleccionada
// e invocar swapKuoAVVariant en ThreeCanvas.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { sectionStyle } from './shared/PropertyStyles';
import { KUO_AV_TUNABLES } from '../../mepal/kuoAV/config/kuoAVTunables';

import { isKuoAVDobleEditablePart } from './KuoAVDobleProperties';

export function isKuoAVEditablePart(part) {
  if (!part) return false;
  if (isKuoAVDobleEditablePart(part)) return false;
  const instId = String(part.instanceId || part.userData?.instanceId || '');
  const parentAssId = String(part.parentAssemblyId || part.userData?.parentAssemblyId || '');
  if (instId.startsWith('KUOAVD_') || parentAssId.startsWith('KUOAVD_')) return false;

  return (
    part.kind === 'KUO_AV_ASSEMBLY' ||
    part.userData?.kind === 'KUO_AV_ASSEMBLY' ||
    part.parent?.userData?.kind === 'KUO_AV_ASSEMBLY' ||
    (instId.startsWith('KUOAV_') && !instId.startsWith('KUOAVD_')) ||
    (parentAssId.startsWith('KUOAV_') && !parentAssId.startsWith('KUOAVD_'))
  );
}

export default function KuoAVProperties({ part, api }) {
  if (!isKuoAVEditablePart(part)) return null;

  const rootPart =
    part?.userData?.kind === 'KUO_AV_ASSEMBLY'
      ? part
      : part?.parent?.userData?.kind === 'KUO_AV_ASSEMBLY'
      ? part.parent
      : part;

  const currentConfig =
    rootPart?.userData?.config ||
    rootPart?.config ||
    part?.userData?.config ||
    part?.config ||
    {};

  const instanceId =
    rootPart?.userData?.instanceId ||
    part?.userData?.instanceId ||
    part?.userData?.parentAssemblyId ||
    part?.instanceId ||
    part?.parentAssemblyId ||
    rootPart?.instanceId ||
    rootPart?.uuid;

  const [anchoMm, setAnchoMm] = useState(currentConfig.anchoMm || 1200);
  const [profundidadMm, setProfundidadMm] = useState(currentConfig.profundidadMm || 600);
  const [alturaMm, setAlturaMm] = useState(currentConfig.alturaMm || 730);
  const [thickMm, setThickMm] = useState(currentConfig.thickMm || 30);
  const [kitFuente, setKitFuente] = useState(currentConfig.kitFuente !== undefined ? !!currentConfig.kitFuente : true);
  const [elevarKitFIzquierdo, setElevarKitFIzquierdo] = useState(!!currentConfig.elevarKitFIzquierdo);
  const [vertebraEnabled, setVertebraEnabled] = useState(
    currentConfig.vertebraEnabled !== undefined
      ? !!currentConfig.vertebraEnabled
      : !!currentConfig.vertebraLateral
  );
  const [vertebraLateral, setVertebraLateral] = useState(!!currentConfig.vertebraLateral);
  const [acabadoGrommet, setAcabadoGrommet] = useState(currentConfig.acabadoGrommet || 'ALUMINIUM');
  const [especial, setEspecial] = useState(!!currentConfig.especial);

  useEffect(() => {
    const cfg =
      rootPart?.userData?.config ||
      rootPart?.config ||
      part?.userData?.config ||
      part?.config ||
      {};

    if (cfg.anchoMm) setAnchoMm(cfg.anchoMm);
    if (cfg.profundidadMm) setProfundidadMm(cfg.profundidadMm);
    if (cfg.alturaMm) setAlturaMm(cfg.alturaMm);
    if (cfg.thickMm) setThickMm(cfg.thickMm);
    if (cfg.kitFuente !== undefined) setKitFuente(cfg.kitFuente);
    if (cfg.elevarKitFIzquierdo !== undefined) setElevarKitFIzquierdo(cfg.elevarKitFIzquierdo);
    if (cfg.vertebraEnabled !== undefined) {
      setVertebraEnabled(cfg.vertebraEnabled);
    } else if (cfg.vertebraLateral !== undefined) {
      setVertebraEnabled(cfg.vertebraLateral);
    }
    if (cfg.vertebraLateral !== undefined) setVertebraLateral(cfg.vertebraLateral);
    if (cfg.acabadoGrommet) setAcabadoGrommet(cfg.acabadoGrommet);
    if (cfg.especial !== undefined) setEspecial(cfg.especial);
  }, [instanceId, rootPart?.userData?.config, part?.config, part?.userData?.config]);

  async function updateConfig(changes) {
    const nextCfg = {
      ...currentConfig,
      anchoMm,
      profundidadMm,
      alturaMm,
      thickMm,
      kitFuente,
      elevarKitFIzquierdo,
      vertebraEnabled,
      vertebraLateral,
      acabadoGrommet,
      especial,
      ...changes,
    };

    console.log('[KUO PARAM DEBUG] KuoAVProperties updateConfig', {
      instanceId,
      changes,
      nextCfg,
    });

    if (!api?.swapKuoAVVariant || !instanceId) {
      console.warn('[KUO PARAM DEBUG] Falta api.swapKuoAVVariant o instanceId:', {
        hasApi: Boolean(api?.swapKuoAVVariant),
        instanceId,
      });
      return;
    }
    await api.swapKuoAVVariant(instanceId, nextCfg);
  }

  return (
    <div style={sectionStyle}>
      <div style={{ fontWeight: 800, fontSize: 13, color: '#111827', marginBottom: 12 }}>
        KUO AV - Superficie Perimetral
      </div>

      {/* ── Ancho ── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Ancho (mm)</div>
        <select
          value={anchoMm}
          onChange={(e) => {
            const val = Number(e.target.value);
            setAnchoMm(val);
            updateConfig({ anchoMm: val });
          }}
          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}
        >
          {KUO_AV_TUNABLES.ANCHOS_MM.map((w) => (
            <option key={w} value={w}>
              {w} mm
            </option>
          ))}
        </select>
      </div>

      {/* ── Fondo ── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Profundidad (mm)</div>
        <select
          value={profundidadMm}
          onChange={(e) => {
            const val = Number(e.target.value);
            setProfundidadMm(val);
            updateConfig({ profundidadMm: val });
          }}
          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}
        >
          {KUO_AV_TUNABLES.FONDOS_MM.map((d) => (
            <option key={d} value={d}>
              {d} mm
            </option>
          ))}
        </select>
      </div>

      {/* ── Altura Ajustable ── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
          <span>Aumentar Altura</span>
          <span style={{ color: '#2563eb' }}>{alturaMm} mm</span>
        </div>
        <input
          type="range"
          min={KUO_AV_TUNABLES.ALTURA_MIN_MM}
          max={KUO_AV_TUNABLES.ALTURA_MAX_MM}
          step={10}
          value={alturaMm}
          onChange={(e) => {
            const val = Number(e.target.value);
            setAlturaMm(val);
            updateConfig({ alturaMm: val });
          }}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>

      {/* ── Espesor Superficie ── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Espesor Superficie</div>
        <select
          value={thickMm}
          onChange={(e) => {
            const val = Number(e.target.value);
            setThickMm(val);
            updateConfig({ thickMm: val });
          }}
          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}
        >
          {KUO_AV_TUNABLES.ESPESORES_MM.map((t) => (
            <option key={t} value={t}>
              {t} mm
            </option>
          ))}
        </select>
      </div>

      {/* ── Acabado de Grommet ── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Acabado de Grommet</div>
        <select
          value={acabadoGrommet}
          onChange={(e) => {
            const val = e.target.value;
            setAcabadoGrommet(val);
            updateConfig({ acabadoGrommet: val });
          }}
          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}
        >
          <option value="ALUMINIUM">Aluminio</option>
          <option value="BLACK">Negro</option>
          <option value="WHITE">Blanco</option>
          <option value="NONE">Sin Grommet</option>
        </select>
      </div>

      {/* ── Toggles de Accesorios y Opciones ── */}
      <div style={{ display: 'grid', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
          <input
            type="checkbox"
            checked={kitFuente}
            onChange={(e) => {
              const val = e.target.checked;
              setKitFuente(val);
              updateConfig({ kitFuente: val });
            }}
          />
          <span style={{ fontWeight: 600 }}>Kit Fuente</span>
        </label>

        {kitFuente && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, paddingLeft: 16 }}>
            <input
              type="checkbox"
              checked={elevarKitFIzquierdo}
              onChange={(e) => {
                const val = e.target.checked;
                setElevarKitFIzquierdo(val);
                updateConfig({ elevarKitFIzquierdo: val });
              }}
            />
            <span style={{ color: '#4b5563' }}>Elevar kit F izquierdo</span>
          </label>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
          <input
            type="checkbox"
            checked={vertebraEnabled}
            onChange={(e) => {
              const val = e.target.checked;
              setVertebraEnabled(val);
              updateConfig({ vertebraEnabled: val });
            }}
          />
          <span style={{ fontWeight: 600 }}>Incluir Vértebra Pasacables</span>
        </label>

        {vertebraEnabled && (
          <div style={{ paddingLeft: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Ubicación de Vértebra</div>
            <select
              value={vertebraLateral ? 'LATERAL' : 'CENTRAL'}
              onChange={(e) => {
                const val = e.target.value === 'LATERAL';
                setVertebraLateral(val);
                updateConfig({ vertebraLateral: val });
              }}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}
            >
              <option value="CENTRAL">Central / Vertical</option>
              <option value="LATERAL">Lateral</option>
            </select>
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
          <input
            type="checkbox"
            checked={especial}
            onChange={(e) => {
              const val = e.target.checked;
              setEspecial(val);
              updateConfig({ especial: val });
            }}
          />
          <span style={{ fontWeight: 600 }}>Especial / Rematable</span>
        </label>
      </div>
    </div>
  );
}
