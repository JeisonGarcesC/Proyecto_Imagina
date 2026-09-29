import { MultipleComposition } from '../definitions/MultipleComposition.js';
import { MULTIPLE_DEFAULT_CONFIG } from '../definitions/multipleDefaults.js';

export function createMultipleConfigurationState(input = {}) {
  const state = { ...MULTIPLE_DEFAULT_CONFIG, ...structuredClone(input) };
  state.widthCm = Number(state.widthCm); state.heightCm = Number(state.heightCm); state.thicknessCm = Number(state.thicknessCm);
  state.frameMode = String(state.frameMode || 'HALF_HEIGHT').toUpperCase();
  state.components = state.components && typeof state.components === 'object' ? state.components : {};
  state.composition = state.door?.enabled ? new MultipleComposition({ frameHeightCm: state.heightCm, baseboardHeightCm: 0,
    slots: [{ slotKey: 'door-0', type: 'DOOR', heightCm: state.heightCm, door: { ...state.door, componentKey: 'door-0', widthCm: state.widthCm, heightCm: state.heightCm } }] }).toJSON()
    : state.composition ? structuredClone(state.composition) : MultipleComposition.documented(state.heightCm).toJSON();
  return state;
}

export function patchMultipleConfigurationState(state, patch = {}) {
  return createMultipleConfigurationState({ ...state, ...structuredClone(patch),
    components: patch.components ? { ...(state.components || {}), ...patch.components } : state.components });
}

export function removeMultipleConfigurationSlot(state, componentKey) {
  const slots = (state.composition?.slots || []).filter((slot) => slot.componentKey !== componentKey);
  const components = { ...(state.components || {}) }; delete components[componentKey];
  return { ...structuredClone(state), components, composition: { ...structuredClone(state.composition), slots: slots.map((slot, index) => ({ ...slot, index })) } };
}
