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

  const normalizeGrommetFinish = (value) => {
    const normalized = String(value || 'ALUMINIUM').trim().toUpperCase();
    if (['PAINTED', 'PINTADO', 'PINTURA', 'BLANCO', 'NEGRO', 'GRIS'].includes(normalized)) {
      return 'PAINTED';
    }
    if (normalized === 'NONE') return 'NONE';
    return 'ALUMINIUM';
  };

  const isPaintedGrommet = (value) => normalizeGrommetFinish(value) === 'PAINTED';
  const optionButtonStyle = (selected) => ({
    flex: 1,
    minWidth: 0,
    padding: '8px 7px',
    border: '1px solid #a6c9a2',
    borderRadius: 8,
    background: selected ? '#fff' : '#b9dcb6',
    color: '#173c1d',
    fontWeight: selected ? 700 : 500,
    cursor: 'pointer',
    fontSize: 12,
    lineHeight: 1.15,
  });

  const checkboxStyle = {
    justifySelf: 'center',
    width: 15,
    height: 15,
    accentColor: '#2563eb',
  };

  const [anchoMm, setAnchoMm] = useState(currentConfig.anchoMm || 1200);
  const [profundidadMm, setProfundidadMm] = useState(currentConfig.profundidadMm || 600);
  const [alturaMm, setAlturaMm] = useState(currentConfig.alturaMm || 730);
  const [thickMm, setThickMm] = useState(currentConfig.thickMm || 30);
  const [espesorTipo, setEspesorTipo] = useState(currentConfig.espesorTipo || currentConfig.espesor || 'Formica 30');
  const [kitFuente, setKitFuente] = useState(currentConfig.kitFuente !== undefined ? !!currentConfig.kitFuente : true);
  const [kitFuenteColor, setKitFuenteColor] = useState(currentConfig.kitFuenteColor || currentConfig.acabadoParales || 'Blanco');
  const [elevarKitFIzquierdo, setElevarKitFIzquierdo] = useState(!!currentConfig.elevarKitFIzquierdo);
  const [vertebraLateral, setVertebraLateral] = useState(!!currentConfig.vertebraLateral);
  const [acabadoGrommet, setAcabadoGrommet] = useState(normalizeGrommetFinish(currentConfig.acabadoGrommet || 'ALUMINIUM'));
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
    if (cfg.espesorTipo || cfg.espesor) setEspesorTipo(cfg.espesorTipo || cfg.espesor);
    if (cfg.kitFuente !== undefined) setKitFuente(cfg.kitFuente);
    if (cfg.kitFuenteColor || cfg.acabadoParales) setKitFuenteColor(cfg.kitFuenteColor || cfg.acabadoParales);
    if (cfg.elevarKitFIzquierdo !== undefined) setElevarKitFIzquierdo(cfg.elevarKitFIzquierdo);
    if (cfg.vertebraLateral !== undefined) setVertebraLateral(cfg.vertebraLateral);
    if (cfg.acabadoGrommet) setAcabadoGrommet(normalizeGrommetFinish(cfg.acabadoGrommet));
    if (cfg.especial !== undefined) setEspecial(cfg.especial);
  }, [instanceId, rootPart?.userData?.config, part?.config, part?.userData?.config]);

  if (!isKuoAVEditablePart(part)) return null;

  async function updateConfig(changes) {
    const nextCfg = {
      ...currentConfig,
      anchoMm,
      profundidadMm,
      alturaMm,
      thickMm,
      espesorTipo,
      kitFuente,
      kitFuenteColor,
      elevarKitFIzquierdo,
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
    <div style={{ ...sectionStyle, background: '#d9efd7', borderColor: '#b8dcb4', padding: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: '#111827', margin: '2px 0 12px' }}>
        KUO AV - Superficie Perimetral
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(112px, 0.85fr) minmax(0, 1.5fr)', columnGap: 10, rowGap: 10, alignItems: 'center', fontSize: 12 }}>
        <span style={{ fontWeight: 700, lineHeight: 1.25 }}>Ancho</span>
        <div style={{ display: 'flex', gap: 6, minWidth: 0 }}>
          {[1200, 1500, 1650].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setAnchoMm(option);
                updateConfig({ anchoMm: option });
              }}
              style={optionButtonStyle(Number(anchoMm) === option)}
            >
              {option / 1000} m
            </button>
          ))}
        </div>

        <span style={{ fontWeight: 700, lineHeight: 1.25 }}>Profundidad</span>
        <div style={{ display: 'flex', gap: 6, minWidth: 0 }}>
          {[600, 750].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setProfundidadMm(option);
                updateConfig({ profundidadMm: option });
              }}
              style={optionButtonStyle(Number(profundidadMm) === option)}
            >
              {option / 1000} m
            </button>
          ))}
        </div>

        <span style={{ fontWeight: 700, lineHeight: 1.25 }}>Espesor Superficie</span>
        <div style={{ display: 'flex', gap: 6, minWidth: 0 }}>
          {['Formica 30', 'Melamina 30'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                const nextThick = 30;
                setEspesorTipo(option);
                setThickMm(nextThick);
                updateConfig({ espesorTipo: option, thickMm: nextThick });
              }}
              style={optionButtonStyle(espesorTipo === option)}
            >
              {option}
            </button>
          ))}
        </div>

        <span style={{ fontWeight: 700, lineHeight: 1.25 }}>Kit Fuente</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minWidth: 0 }}>
          {['Blanco', 'Negro', 'Gris'].map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setKitFuente(true);
                setKitFuenteColor(color);
                updateConfig({ kitFuente: true, kitFuenteColor: color });
              }}
              style={optionButtonStyle(kitFuente && kitFuenteColor === color)}
            >
              Kit Fuente {color}
            </button>
          ))}
        </div>

        <label style={{ display: 'contents', cursor: 'pointer' }}>
          <span style={{ fontWeight: 700, lineHeight: 1.25 }}>Acabado de Grommet (Pintura)</span>
          <input
            type="checkbox"
            checked={isPaintedGrommet(acabadoGrommet)}
            onChange={(e) => {
              const val = e.target.checked ? 'PAINTED' : 'ALUMINIUM';
              setAcabadoGrommet(val);
              updateConfig({ acabadoGrommet: val });
            }}
            style={checkboxStyle}
          />
        </label>

        <button
          type="button"
          onClick={() => {
            const val = !especial;
            setEspecial(val);
            updateConfig({ especial: val });
          }}
          style={{ display: 'contents', cursor: 'pointer', textAlign: 'left', border: 0, padding: 0, color: 'inherit' }}
        >
          <span style={{ fontWeight: 700 }}>Especial/Rematable</span>
          <span style={{ justifySelf: 'center', width: 15, height: 15, border: '1px solid #8fa98d', borderRadius: 3, background: especial ? '#2563eb' : '#fff', color: '#fff', fontSize: 11, lineHeight: '13px', textAlign: 'center' }}>
            {especial ? '✓' : ''}
          </span>
        </button>

        <label style={{ display: 'contents', cursor: 'pointer' }}>
          <span style={{ fontWeight: 700, lineHeight: 1.25 }}>Aumentar Altura</span>
          <input
            type="checkbox"
            checked={alturaMm > KUO_AV_TUNABLES.ALTURA_MIN_MM}
            onChange={(e) => {
              const val = e.target.checked
                ? KUO_AV_TUNABLES.ALTURA_MAX_MM
                : KUO_AV_TUNABLES.ALTURA_MIN_MM;
              setAlturaMm(val);
              updateConfig({ alturaMm: val });
            }}
            style={checkboxStyle}
          />
        </label>

        <button
          type="button"
          onClick={() => {
            const val = !elevarKitFIzquierdo;
            setElevarKitFIzquierdo(val);
            updateConfig({ elevarKitFIzquierdo: val });
          }}
          style={{ display: 'contents', cursor: 'pointer', textAlign: 'left', border: 0, padding: 0, color: 'inherit' }}
        >
          <span style={{ fontWeight: 700, lineHeight: 1.25 }}>Elevar kit F izquierdo</span>
          <span style={{ justifySelf: 'center', width: 15, height: 15, border: '1px solid #8fa98d', borderRadius: 3, background: elevarKitFIzquierdo ? '#2563eb' : '#fff', color: '#fff', fontSize: 11, lineHeight: '13px', textAlign: 'center' }}>
            {elevarKitFIzquierdo ? '✓' : ''}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            const val = !vertebraLateral;
            setVertebraLateral(val);
            updateConfig({ vertebraLateral: val });
          }}
          style={{ display: 'contents', cursor: 'pointer', textAlign: 'left', border: 0, padding: 0, color: 'inherit' }}
        >
          <span style={{ fontWeight: 700, lineHeight: 1.25 }}>Colocar Vértebra Lateral</span>
          <span style={{ justifySelf: 'center', width: 15, height: 15, border: '1px solid #8fa98d', borderRadius: 3, background: vertebraLateral ? '#2563eb' : '#fff', color: '#fff', fontSize: 11, lineHeight: '13px', textAlign: 'center' }}>
            {vertebraLateral ? '✓' : ''}
          </span>
        </button>

      </div>
    </div>
  );
}
