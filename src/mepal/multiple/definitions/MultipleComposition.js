import { MULTIPLE_BASEBOARD_HEIGHT_CM, MULTIPLE_DOCUMENTED_COMPOSITIONS } from '../catalog/multipleFrameCatalog.js';
import { resolveMultipleTileType } from '../catalog/multipleTileCatalog.js';
import { validateMultipleCompositionCore } from '../rules/core/multipleCoreRules.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

export class MultipleComposition {
  constructor({ frameHeightCm, baseboardHeightCm = MULTIPLE_BASEBOARD_HEIGHT_CM, slots = [], growth = [], columns = [], accessories = [] } = {}) {
    this.kind = 'MULTIPLE_COMPOSITION';
    this.frameHeightCm = Number(frameHeightCm);
    this.baseboardHeightCm = Number(baseboardHeightCm);
    this.slots = slots.map((slot, index) => ({ slotKey: String(slot.slotKey || `slot-${index}`), index,
      componentKey: String(slot.componentKey || (String(slot.type || 'TILE').toUpperCase() === 'DOOR' ? `${slot.slotKey || 'door-0'}-leaf` : `tile-${index}`)),
      type: String(slot.type || 'TILE').toUpperCase(),
      heightCm: Number(slot.heightCm), tileType: String(slot.tileType || 'FORMICA').toUpperCase(),
      variant: slot.variant ? String(slot.variant).toUpperCase() : null, door: slot.door ? clone(slot.door) : null,
      codigoPT: slot.codigoPT || null, reference: slot.reference || null,
      commercialStatus: slot.commercialStatus || 'PENDING' }));
    this.growth = clone(growth); this.columns = clone(columns); this.accessories = clone(accessories);
    this.validate();
  }
  validate() {
    if (!Number.isFinite(this.frameHeightCm) || this.frameHeightCm <= 0) throw new Error('MULTIPLE_INVALID_FRAME_HEIGHT');
    if (!Number.isFinite(this.baseboardHeightCm) || this.baseboardHeightCm < 0) throw new Error('MULTIPLE_INVALID_BASEBOARD_HEIGHT');
    let occupied = this.baseboardHeightCm;
    for (const slot of this.slots) {
      if (slot.type === 'DOOR') { if (!slot.door) throw new Error('MULTIPLE_DOOR_CONFIG_REQUIRED'); occupied += slot.heightCm; continue; }
      const tile = resolveMultipleTileType(slot.tileType);
      if (!tile) throw new Error(`MULTIPLE_TILE_TYPE_NOT_SUPPORTED:${slot.tileType}`);
      if (!tile.heightsCm.includes(slot.heightCm)) throw new Error(`MULTIPLE_TILE_HEIGHT_NOT_SUPPORTED:${slot.slotKey}`);
      if (slot.variant && tile.variants && !tile.variants.includes(slot.variant)) throw new Error(`MULTIPLE_TILE_VARIANT_NOT_SUPPORTED:${slot.slotKey}`);
      occupied += slot.heightCm;
    }
    if (occupied !== this.frameHeightCm) throw new Error('MULTIPLE_COMPOSITION_HEIGHT_MISMATCH');
    const core = validateMultipleCompositionCore({ heightCm: this.frameHeightCm,
      door: this.slots.some((slot) => slot.type === 'DOOR') ? { enabled: true } : null }, this.toJSON());
    if (!core.valid) throw new Error(core.diagnostics[0].code);
    return true;
  }
  withSlot(slotKey, patch = {}) {
    return new MultipleComposition({ frameHeightCm: this.frameHeightCm, baseboardHeightCm: this.baseboardHeightCm,
      slots: this.slots.map((slot) => slot.slotKey === slotKey ? { ...slot, ...patch } : slot), growth: this.growth, columns: this.columns, accessories: this.accessories });
  }
  toJSON() { return clone({ kind: this.kind, frameHeightCm: this.frameHeightCm, baseboardHeightCm: this.baseboardHeightCm, slots: this.slots, growth: this.growth, columns: this.columns, accessories: this.accessories }); }
  static documented(frameHeightCm, tileType = 'FORMICA') {
    const heights = MULTIPLE_DOCUMENTED_COMPOSITIONS[Number(frameHeightCm)];
    if (!heights) throw new Error('MULTIPLE_COMPOSITION_NOT_DOCUMENTED');
    return new MultipleComposition({ frameHeightCm,
      slots: heights.map((heightCm, index) => ({ slotKey: `slot-${index}`, heightCm, tileType })) });
  }
  static from(value, frameHeightCm) {
    if (value instanceof MultipleComposition) return value;
    if (!value) return MultipleComposition.documented(frameHeightCm);
    return new MultipleComposition({ ...value, frameHeightCm: value.frameHeightCm ?? frameHeightCm });
  }
}
