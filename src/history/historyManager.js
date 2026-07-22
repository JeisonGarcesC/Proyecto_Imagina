export const MAX_HISTORY = 50;

export const HISTORY_ACTION_TYPES = Object.freeze({
  MOVE: 'MOVE',
  ROTATE: 'ROTATE',
  DELETE: 'DELETE',
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
  #isReplaying = false;

  constructor({ maxHistory = MAX_HISTORY, replayAction = null, onDiscard = null } = {}) {
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

    this.#maxHistory = normalizedLimit;
    this.#replayAction = replayAction;
    this.#onDiscard = onDiscard;
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

    return normalizedAction;
  }

  async undo() {
    if (!this.canUndo() || this.#isReplaying) return null;

    const action = this.#undoStack.pop();
    this.#isReplaying = true;

    try {
      await this.#replayAction?.(action, 'undo');
      this.#redoStack.push(action);
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
