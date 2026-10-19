export const MAX_HISTORY = 50;

export const HISTORY_ACTION_TYPES = Object.freeze({
  MOVE: 'MOVE',
  LINK_CONFIG_CHANGE: 'LINK_CONFIG_CHANGE',
  MULTIPLE_CONFIG_CHANGE: 'MULTIPLE_CONFIG_CHANGE',
  MULTIPLE_SYSTEM_ADD_MODULE: 'MULTIPLE_SYSTEM_ADD_MODULE',
  MULTIPLE_SYSTEM_REMOVE_MODULE: 'MULTIPLE_SYSTEM_REMOVE_MODULE',
  MULTIPLE_SYSTEM_DUPLICATE_MODULE: 'MULTIPLE_SYSTEM_DUPLICATE_MODULE',
  MULTIPLE_SYSTEM_UPDATE_MODULE: 'MULTIPLE_SYSTEM_UPDATE_MODULE',
  MULTIPLE_LAYOUT_MOVE: 'MULTIPLE_LAYOUT_MOVE',
  MULTIPLE_SYSTEM_MOVE: 'MULTIPLE_SYSTEM_MOVE',
  MULTIPLE_CONNECT_MODULES: 'MULTIPLE_CONNECT_MODULES',
  MULTIPLE_ALIGN_MODULES: 'MULTIPLE_ALIGN_MODULES',
  KONCISA_SURFACE_CONFIG_CHANGE: 'KONCISA_SURFACE_CONFIG_CHANGE',
  KONCISA_LEADER_OUTLET_COUPLING_CHANGE: 'KONCISA_LEADER_OUTLET_COUPLING_CHANGE',
  LOCKER_CONFIG_CHANGE: 'LOCKER_CONFIG_CHANGE',
  ROTATE: 'ROTATE',
  DELETE: 'DELETE',
  CREATE_OBJECTS: 'CREATE_OBJECTS',
  APPLY_SPECIAL_FINISH: 'APPLY_SPECIAL_FINISH',
  CREATE_DIMENSION: 'CREATE_DIMENSION',
  UPDATE_DIMENSION: 'UPDATE_DIMENSION',
  DELETE_DIMENSION: 'DELETE_DIMENSION',
  CREATE_SHAPE_2D: 'CREATE_SHAPE_2D',
  UPDATE_SHAPE_2D: 'UPDATE_SHAPE_2D',
  DELETE_SHAPE_2D: 'DELETE_SHAPE_2D',
  CRITTERIUM_8_CONFIG_CHANGE: 'CRITTERIUM_8_CONFIG_CHANGE',
  CRITTERIUM_8_SEQUENCE_CREATE: 'CRITTERIUM_8_SEQUENCE_CREATE',
  CRITTERIUM_8_SEQUENCE_REBUILD: 'CRITTERIUM_8_SEQUENCE_REBUILD',
  CRITTERIUM_8_SEQUENCE_DISSOLVE: 'CRITTERIUM_8_SEQUENCE_DISSOLVE',
  CRITTERIUM_8_SEQUENCE_ADD_FRAME: 'CRITTERIUM_8_SEQUENCE_ADD_FRAME',
  CRITTERIUM_8_SEQUENCE_REMOVE_FRAME: 'CRITTERIUM_8_SEQUENCE_REMOVE_FRAME',
  CRITTERIUM_MODULE_SLOT_ADD: 'CRITTERIUM_MODULE_SLOT_ADD',
  CRITTERIUM_MODULE_SLOT_INSERT: 'CRITTERIUM_MODULE_SLOT_INSERT',
  CRITTERIUM_MODULE_SLOT_DUPLICATE: 'CRITTERIUM_MODULE_SLOT_DUPLICATE',
  CRITTERIUM_MODULE_SLOT_REMOVE: 'CRITTERIUM_MODULE_SLOT_REMOVE',
  CRITTERIUM_MODULE_SLOT_REORDER: 'CRITTERIUM_MODULE_SLOT_REORDER',
  CRITTERIUM_MODULE_SLOT_CONFIGURE: 'CRITTERIUM_MODULE_SLOT_CONFIGURE',
  CRITTERIUM_MODULE_SLOT_ORGANIZE: 'CRITTERIUM_MODULE_SLOT_ORGANIZE',
  CRITERIUM_SYSTEM_CREATE: 'CRITERIUM_SYSTEM_CREATE',
  CRITERIUM_SYSTEM_ADD_SEQUENCE: 'CRITERIUM_SYSTEM_ADD_SEQUENCE',
  CRITERIUM_SYSTEM_REMOVE_SEQUENCE: 'CRITERIUM_SYSTEM_REMOVE_SEQUENCE',
  CRITERIUM_SYSTEM_MOVE: 'CRITERIUM_SYSTEM_MOVE',
  CRITERIUM_SYSTEM_MOVE_SEQUENCE: 'CRITERIUM_SYSTEM_MOVE_SEQUENCE',
  CRITERIUM_SYSTEM_CONNECT_SEQUENCE: 'CRITERIUM_SYSTEM_CONNECT_SEQUENCE',
  CRITERIUM_SYSTEM_DISCONNECT_SEQUENCE: 'CRITERIUM_SYSTEM_DISCONNECT_SEQUENCE',
  CRITERIUM_SYSTEM_ALIGN_SEQUENCE: 'CRITERIUM_SYSTEM_ALIGN_SEQUENCE',
  CRITERIUM_SYSTEM_DISTRIBUTE_SEQUENCE: 'CRITERIUM_SYSTEM_DISTRIBUTE_SEQUENCE',
  CRITERIUM_SYSTEM_ROTATE_SEQUENCE: 'CRITERIUM_SYSTEM_ROTATE_SEQUENCE',
  CRITERIUM_SYSTEM_AUTO_LAYOUT: 'CRITERIUM_SYSTEM_AUTO_LAYOUT',
  CRITERIUM_SYSTEM_DUPLICATE_SEQUENCE: 'CRITERIUM_SYSTEM_DUPLICATE_SEQUENCE',
  CRITERIUM_SYSTEM_CREATE_SEQUENCE: 'CRITERIUM_SYSTEM_CREATE_SEQUENCE',
  CRITERIUM_SYSTEM_DELETE_SEQUENCE: 'CRITERIUM_SYSTEM_DELETE_SEQUENCE',
  CRITERIUM_SYSTEM_DELETE: 'CRITERIUM_SYSTEM_DELETE',
});

let actionSequence = 0;

function normalizeAction(action) {
  if (!action || typeof action !== 'object') {
    throw new TypeError('History action must be an object.');
  }

  const type = String(action.type || '').trim();
  if (!type) throw new TypeError('History action requires a type.');

  const timestamp = Number.isFinite(Number(action.timestamp))
    ? Number(action.timestamp)
    : Date.now();

  actionSequence += 1;

  return {
    ...action,
    id: action.id || `history_${timestamp}_${actionSequence}`,
    type,
    timestamp,
    before: action.before ?? null,
    after: action.after ?? null,
  };
}

export class HistoryManager {
  #undoStack = [];
  #redoStack = [];
  #maxHistory;
  #replayAction;
  #onDiscard;
  #onAction;
  #isReplaying = false;

  constructor({
    maxHistory = MAX_HISTORY,
    replayAction = null,
    onDiscard = null,
    onAction = null,
  } = {}) {
    const normalizedLimit = Math.floor(Number(maxHistory));
    if (!Number.isFinite(normalizedLimit) || normalizedLimit < 1) {
      throw new RangeError('maxHistory must be a positive number.');
    }

    if (replayAction !== null && typeof replayAction !== 'function') {
      throw new TypeError('replayAction must be a function or null.');
    }

    if (onDiscard !== null && typeof onDiscard !== 'function') {
      throw new TypeError('onDiscard must be a function or null.');
    }
    if (onAction !== null && typeof onAction !== 'function') {
      throw new TypeError('onAction must be a function or null.');
    }

    this.#maxHistory = normalizedLimit;
    this.#replayAction = replayAction;
    this.#onDiscard = onDiscard;
    this.#onAction = onAction;
  }

  get isReplaying() {
    return this.#isReplaying;
  }

  pushAction(action) {
    if (this.#isReplaying) return null;

    const normalizedAction = normalizeAction(action);
    this.#discardActions(this.#redoStack, 'redo-cleared');
    this.#redoStack = [];
    this.#undoStack.push(normalizedAction);

    while (this.#undoStack.length > this.#maxHistory) {
      const discardedAction = this.#undoStack.shift();
      this.#discardAction(discardedAction, 'limit');
    }

    this.#onAction?.(normalizedAction, 'push');
    return normalizedAction;
  }

  async undo() {
    if (!this.canUndo() || this.#isReplaying) return null;

    const action = this.#undoStack.pop();
    this.#isReplaying = true;

    try {
      await this.#replayAction?.(action, 'undo');
      this.#redoStack.push(action);
      this.#onAction?.(action, 'undo');
      return action;
    } catch (error) {
      this.#undoStack.push(action);
      throw error;
    } finally {
      this.#isReplaying = false;
    }
  }

  async redo() {
    if (!this.canRedo() || this.#isReplaying) return null;

    const action = this.#redoStack.pop();
    this.#isReplaying = true;

    try {
      await this.#replayAction?.(action, 'redo');
      this.#undoStack.push(action);
      this.#onAction?.(action, 'redo');
      return action;
    } catch (error) {
      this.#redoStack.push(action);
      throw error;
    } finally {
      this.#isReplaying = false;
    }
  }

  clearHistory() {
    if (this.#isReplaying) return false;

    this.#discardActions(this.#undoStack, 'clear');
    this.#discardActions(this.#redoStack, 'clear');
    this.#undoStack = [];
    this.#redoStack = [];
    return true;
  }

  canUndo() {
    return this.#undoStack.length > 0;
  }

  canRedo() {
    return this.#redoStack.length > 0;
  }

  #discardActions(actions, reason) {
    actions.forEach((action) => this.#discardAction(action, reason));
  }

  #discardAction(action, reason) {
    if (!action) return;
    this.#onDiscard?.(action, reason);
  }
}

export function createHistoryManager(options) {
  return new HistoryManager(options);
}
