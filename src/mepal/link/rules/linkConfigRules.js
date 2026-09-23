import { LINK_DEFAULT_CONFIG } from '../definitions/linkDefaults.js';
import { LINK_TYPES, LINK_WIDTHS, LINK_LEADER_WIDTHS, LINK_DEPTHS } from '../catalog/linkCatalog.js';
import { getLinkFinishOptions, LINK_SUPPORT_SHAPES } from '../catalog/linkFinishCatalog.js';
import { normalizeLinkComponents } from './linkComponentRules.js';
import { normalizeLinkComponentTransforms } from '../integration/linkComponentIdentity.js';

export function isLinkLeader(type) { return type === 'lider' || type === 'jefatura'; }
export function normalizeLinkConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Configuración LINK inválida.');
  const c = { ...LINK_DEFAULT_CONFIG, ...input };
  // Backward compatibility: the earlier synonymous name is never offered as a separate product.
  if (c.type === 'jefatura') c.type = 'lider';
  if (!LINK_TYPES.some(t => t.value === c.type)) throw new Error('Tipo de puesto LINK no disponible.');
  for (const key of ['pasacable', 'ducto', 'ductCover', 'floorDuct', 'ceilingDuct']) {
    if (input[key] && input[key] !== 'none') throw new Error('Configura los accesorios desde la pieza LINK correspondiente.');
  }
  if (input.tipoPasoCable && input.tipoPasoCable !== 'none') throw new Error('Usa la opción grommet de LINK.');
  if (input.accessories?.length) throw new Error('Accesorios LINK no disponibles.');
  if (typeof c.hasDuct !== 'boolean') throw new Error('Opción de ducto LINK inválida.');
  const leader = isLinkLeader(c.type), widths = leader ? LINK_LEADER_WIDTHS : LINK_WIDTHS;
  const widthMm = Number(c.widthMm), depthMm = Number(c.depthMm), puestos = Number(c.puestos);
  if (!Number.isInteger(puestos) || puestos < 1 || puestos > 12 || (leader && puestos !== 1)) throw new Error('Cantidad de puestos no válida.');
  const special = c.modoEspecial === true;
  if (special ? !Number.isFinite(widthMm) || widthMm < (leader ? 1500 : 900) || widthMm > 1800 || !Number.isFinite(depthMm) || depthMm < 600 || depthMm > 750
    : !widths.includes(widthMm) || !LINK_DEPTHS.includes(depthMm)) throw new Error('Dimensiones LINK no disponibles.');
  if (!['principal', 'plena'].includes(c.surfaceMode) || (c.type !== 'doble' && c.surfaceMode !== 'principal')) throw new Error('Superficie LINK no disponible.');
  if (!['derecha', 'izquierda'].includes(c.side)) throw new Error('Entrega LINK no disponible.');
  const returnLengthMm = Number(c.returnLengthMm);
  if (special ? !Number.isFinite(returnLengthMm) || returnLengthMm < 900 || returnLengthMm > 1000 : ![900,1000].includes(returnLengthMm)) throw new Error('Retorno LINK no disponible.');
  if (!getLinkFinishOptions(c.type).some(f => f.id === c.finishId)) throw new Error('Acabado LINK no disponible.');
  if (leader && c.leaderCredenza && c.finishId !== 'FORMICA_30') throw new Error('La superficie a credenza LINK disponible usa fórmica de 30 mm.');
  if (!LINK_SUPPORT_SHAPES.some(s => s.value === c.tipoCostado)) throw new Error('Tipo de costado no disponible.');
  if (!['PINTADO','CROMADO'].includes(c.supportFinish)) throw new Error('Acabado de costado inválido.');
  if (!['none','grommet'].includes(c.cableAccess) || !['ALUMINIUM','PAINTED'].includes(c.grommetFinish)) throw new Error('Grommet LINK no válido.');
  if (typeof c.leaderReturnGrommet !== 'boolean' || typeof c.leaderCredenza !== 'boolean') throw new Error('Configuración líder LINK inválida.');
  const leaderCredenzaLengthMm = Number(c.leaderCredenzaLengthMm);
  if (![1200,1500].includes(leaderCredenzaLengthMm)) throw new Error('Largo de credenza LINK no válido.');
  for (const key of ['surfaceColor','structureColor','pedestalColor']) if (!/^#[\da-f]{6}$/i.test(c[key])) throw new Error('Color LINK inválido.');
  if (!leader && input.pedestal) throw new Error('Sencillo y doble no llevan pedestal.');
  const finishAssignments = {};
  for (const [key,value] of Object.entries(c.finishAssignments || {})) if (typeof value === 'string' && /^(?:\*|role:[A-Z_]+|component:[\w-]+)$/.test(key)) finishAssignments[key] = value.trim();
  return { type:c.type, widthMm, depthMm, surfaceMode:c.surfaceMode, returnLengthMm, side:c.side,
    puestos, modoEspecial:special, finishId:c.finishId, tipoCostado:c.tipoCostado, supportFinish:c.supportFinish,
    hasDuct:c.hasDuct, cableAccess:c.cableAccess, grommetFinish:c.grommetFinish, finishAssignments,
    componentTransforms:normalizeLinkComponentTransforms(c.componentTransforms),
    components:normalizeLinkComponents(c.components,c.type), leaderReturnGrommet:c.leaderReturnGrommet,
    leaderCredenza:c.leaderCredenza, leaderCredenzaLengthMm,
    surfaceColor:c.surfaceColor, structureColor:c.structureColor, pedestalColor:c.pedestalColor };
}
