import { LINK_DEFAULT_CONFIG } from '../definitions/linkDefaults.js';
import { LINK_TYPES, LINK_WIDTHS, LINK_LEADER_WIDTHS, LINK_LEADER_RETURN_LENGTHS, LINK_LEADER_RETURN_DEPTHS, LINK_DEPTHS } from '../catalog/linkCatalog.js';
import { getLinkFinishOptions, LINK_SUPPORT_SHAPES } from '../catalog/linkFinishCatalog.js';
import { normalizeLinkComponents } from './linkComponentRules.js';
import { LINK_CREDENZA_EXE_LENGTHS, LINK_CREDENZA_EXE_MODELS } from './linkCredenzaExeRules.js';
import { normalizeLinkComponentTransforms } from '../integration/linkComponentIdentity.js';

export function isLinkLeader(type) { return type === 'lider' || type === 'jefatura'; }
export function normalizeLinkConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Configuración LINK inválida.');
  const c = { ...LINK_DEFAULT_CONFIG, ...input };
  // Backward compatibility: the earlier synonymous name is never offered as a separate product.
  if (c.type === 'jefatura') c.type = 'lider';
  if (!LINK_TYPES.some(t => t.value === c.type)) throw new Error('Tipo de puesto LINK no disponible.');
  if (c.type === 'credenza') {
    // Credenza independiente (Link Exe): una sola pieza GLB, sin superficies, costados ni accesorios de puesto.
    const credenzaLengthMm = Number(c.credenzaLengthMm);
    if (!LINK_CREDENZA_EXE_LENGTHS.includes(credenzaLengthMm)) throw new Error('Largo de credenza LINK no válido.');
    if (!LINK_CREDENZA_EXE_MODELS.some(m => m.value === c.credenzaModel)) throw new Error('Modelo de credenza LINK no válido.');
    Object.assign(c, { credenzaLengthMm, widthMm: credenzaLengthMm, depthMm: 600, puestos: 1, modoEspecial: false, surfaceMode: 'principal',
      hasDuct: false, hasPantallaFrontal: false, hasPantallaLateral: false, hasPantallaFalda: false, integracionType: 'ninguna',
      leaderCredenza: false, leaderReturnGrommet: false });
  }
  if (c.type === 'puesto120') {
    const depthMm = [600, 750].includes(Number(c.depthMm)) ? Number(c.depthMm) : 600;
    const disp = c.disposicion120 || 'individual';
    const is360 = disp === '360';
    const isDoble = disp === 'doble';
    const puestos = is360 ? 3 : (isDoble ? 2 : 1);
    Object.assign(c, {
      disposicion120: disp,
      side120: ['derecha', 'izquierda'].includes(c.side120) ? c.side120 : 'derecha',
      grommetSide120: ['izquierda', 'derecha', 'ambos'].includes(c.grommetSide120) ? c.grommetSide120 : 'izquierda',
      widthMm: 1200, depthMm, puestos, modoEspecial: false, surfaceMode: 'principal',
      hasDuct: (is360 || isDoble) ? (c.hasDuct !== false) : false,
      hasPantallaFrontal: false, hasPantallaLateral: false, hasPantallaFalda: false, integracionType: 'ninguna',
      leaderCredenza: false, leaderReturnGrommet: false
    });
  }
  for (const key of ['pasacable', 'ducto', 'ductCover', 'floorDuct', 'ceilingDuct']) {
    if (input[key] && input[key] !== 'none') throw new Error('Configura los accesorios desde la pieza LINK correspondiente.');
  }
  if (input.tipoPasoCable && input.tipoPasoCable !== 'none') throw new Error('Usa la opción grommet de LINK.');
  if (input.accessories?.length) throw new Error('Accesorios LINK no disponibles.');
  if (typeof c.hasDuct !== 'boolean') throw new Error('Opción de ducto LINK inválida.');
  const leader = isLinkLeader(c.type), widths = leader ? LINK_LEADER_WIDTHS : LINK_WIDTHS;
  const widthMm = Number(c.widthMm), depthMm = Number(c.depthMm), puestos = Number(c.puestos);
  const special = c.modoEspecial === true;
  if (c.type !== 'credenza' && c.type !== 'puesto120') {
    if (!Number.isInteger(puestos) || puestos < 1 || puestos > 12 || (leader && puestos !== 1)) throw new Error('Cantidad de puestos no válida.');
    if (special ? !Number.isFinite(widthMm) || widthMm < (leader ? 1500 : 900) || widthMm > (leader ? 1800 : 1851) || !Number.isFinite(depthMm) || depthMm < 600 || depthMm > 750
      : !widths.includes(widthMm) || !LINK_DEPTHS.includes(depthMm)) throw new Error('Dimensiones LINK no disponibles.');
  }
  if (!['principal', 'plena'].includes(c.surfaceMode) || (c.type !== 'doble' && c.surfaceMode !== 'principal')) throw new Error('Superficie LINK no disponible.');
  if (!['derecha', 'izquierda'].includes(c.side)) throw new Error('Entrega LINK no disponible.');
  const returnLengthMm = Number(c.returnLengthMm), returnDepthMm = Number(c.returnDepthMm);
  // Retorno del líder con las mismas medidas que Koncisa Plus: largo 900/1000 (especial 900–1000) y fondo 600 (especial 600–750).
  if (leader && !c.leaderCredenza) {
    if (special ? !Number.isFinite(returnLengthMm) || returnLengthMm < 900 || returnLengthMm > 1000 : !LINK_LEADER_RETURN_LENGTHS.includes(returnLengthMm)) throw new Error('Retorno LINK no disponible.');
    if (special ? !Number.isFinite(returnDepthMm) || returnDepthMm < 600 || returnDepthMm > 750 : !LINK_LEADER_RETURN_DEPTHS.includes(returnDepthMm)) throw new Error('Profundidad de retorno LINK no disponible.');
  }
  if (!getLinkFinishOptions(c.type).some(f => f.id === c.finishId)) throw new Error('Acabado LINK no disponible.');
  if (leader && c.leaderCredenza && c.finishId !== 'FORMICA_30') throw new Error('La superficie a credenza LINK disponible usa fórmica de 30 mm.');
  if (!LINK_SUPPORT_SHAPES.some(s => s.value === c.tipoCostado)) throw new Error('Tipo de costado no disponible.');
  if (!['PINTADO','CROMADO'].includes(c.supportFinish)) throw new Error('Acabado de costado inválido.');
  if (!['none','grommet'].includes(c.cableAccess) || !['ALUMINIUM','PAINTED'].includes(c.grommetFinish)) throw new Error('Grommet LINK no válido.');
  if (!['ninguna', 'individual', 'recta', 'redonda', 'curva', '120'].includes(c.integracionType)) throw new Error('Superficie de integración LINK no válida.');
  if (!['ambas', 'izquierda', 'derecha'].includes(c.integracionSide)) throw new Error('Lado de integración LINK no válido.');
  if (!['izquierda', 'derecha'].includes(c.integracionHoleSide)) throw new Error('Lado del orificio LINK no válido.');
  if (c.type === 'sencillo' && c.integracionType === '120') c.integracionType = 'ninguna';
  if (c.type === 'sencillo' && !['ninguna', 'individual'].includes(c.integracionType)) throw new Error('En puesto individual, la integración LINK disponible es individual.');
  if (c.type === 'doble' && ['individual'].includes(c.integracionType)) throw new Error('La integración individual LINK solo está disponible en puesto individual.');
  if (!['sencillo', 'doble'].includes(c.type) && c.integracionType !== 'ninguna') throw new Error('Superficie de integración LINK no disponible para este tipo.');
  if (typeof c.leaderReturnGrommet !== 'boolean' || typeof c.leaderCredenza !== 'boolean') throw new Error('Configuración líder LINK inválida.');
  if (typeof c.hasPantallaFalda !== 'boolean' || !['formica', 'vidrio', 'melamina', 'tela'].includes(c.pantallaFaldaMaterial)) throw new Error('Falda pantalla LINK no válida.');
  if (c.hasPantallaFalda && c.type !== 'sencillo') throw new Error('La falda pantalla LINK solo está disponible para puesto individual.');
  if (leader && c.leaderCredenza) {
    if (!LINK_CREDENZA_EXE_LENGTHS.includes(Number(c.credenzaLengthMm))) throw new Error('Largo de credenza LINK no válido.');
    if (!LINK_CREDENZA_EXE_MODELS.some(m => m.value === c.credenzaModel)) throw new Error('Modelo de credenza LINK no válido.');
  }
  for (const key of ['surfaceColor','structureColor','pedestalColor']) if (!/^#[\da-f]{6}$/i.test(c[key])) throw new Error('Color LINK inválido.');
  if (!leader && input.pedestal) throw new Error('Sencillo y doble no llevan pedestal.');
  const finishAssignments = {};
  for (const [key,value] of Object.entries(c.finishAssignments || {})) if (typeof value === 'string' && /^(?:\*|role:[A-Z_]+|component:[\w-]+)$/.test(key)) finishAssignments[key] = value.trim();
  return { type:c.type, widthMm, depthMm, surfaceMode:c.surfaceMode, returnLengthMm, returnDepthMm, side:c.side,
    puestos, modoEspecial:c.modoEspecial === true, finishId:c.finishId, tipoCostado:c.tipoCostado, supportFinish:c.supportFinish,
    hasDuct:c.hasDuct, cableAccess:c.cableAccess, grommetFinish:c.grommetFinish, finishAssignments,
    componentTransforms:normalizeLinkComponentTransforms(c.componentTransforms),
    components:normalizeLinkComponents(c.components,c.type), leaderReturnGrommet:c.leaderReturnGrommet,
    leaderCredenza:c.leaderCredenza, credenzaLengthMm:Number(c.credenzaLengthMm), credenzaModel:c.credenzaModel,
    surfaceColor:c.surfaceColor, structureColor:c.structureColor, pedestalColor:c.pedestalColor,
    hasPantallaFrontal:c.type==='doble' && c.hasPantallaFrontal, pantallaFrontalMaterial:c.pantallaFrontalMaterial,
    hasPantallaLateral:c.hasPantallaLateral, pantallaLateralMaterial:c.pantallaLateralMaterial,
    pantallaLateralSide:['ambos','ambas','izquierda','derecha'].includes(c.pantallaLateralSide)?(c.pantallaLateralSide==='ambas'?'ambos':c.pantallaLateralSide):'ambos',
    hasPantallaFalda:c.hasPantallaFalda, pantallaFaldaMaterial:c.pantallaFaldaMaterial,
    integracionType:c.integracionType, integracionSide:c.integracionSide, integracionHoleSide:c.integracionHoleSide,
    disposicion120: ['individual', 'doble', '360'].includes(c.disposicion120) ? c.disposicion120 : 'individual',
    side120: ['derecha', 'izquierda'].includes(c.side120) ? c.side120 : 'derecha',
    grommetSide120: ['izquierda', 'derecha', 'ambos'].includes(c.grommetSide120) ? c.grommetSide120 : 'izquierda',
    integracion120Wing: ['ambas', 'izquierda', 'derecha'].includes(c.integracion120Wing) ? c.integracion120Wing : 'ambas' };
}
