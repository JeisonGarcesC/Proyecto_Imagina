import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CRITTERIUM_LIBRARY_OPTIONS,
  resolveCritteriumLibraryDrafts,
} from '../src/mepal/critterium8/integration/critteriumModuleLibrary.js';
import {
  validateCritteriumSequenceDraft,
  validateCritteriumSystemDraft,
} from '../src/mepal/critterium8/integration/critterium8Configurator.js';

test('library presets use the existing validated sequence draft', () => {
  for (const key of ['SEQUENCE_2', 'SEQUENCE_3']) {
    const [draft] = resolveCritteriumLibraryDrafts(key);
    assert.equal(validateCritteriumSequenceDraft(draft).success, true);
    assert.equal(draft.frames.length, key === 'SEQUENCE_2' ? 2 : 3);
  }
});

test('office presets contain supported frames and no invented commercial data', () => {
  assert.deepEqual(resolveCritteriumLibraryDrafts('OFFICE_EMPTY'), []);
  for (const key of ['OFFICE_2', 'OFFICE_2_3']) {
    const drafts = resolveCritteriumLibraryDrafts(key);
    assert.equal(validateCritteriumSystemDraft(drafts).success, true);
    assert.equal(JSON.stringify(drafts).includes('price'), false);
    assert.equal(JSON.stringify(drafts).includes('code'), false);
  }
  assert.deepEqual(resolveCritteriumLibraryDrafts('OFFICE_2_3').map((draft) => draft.frames.length), [2, 3]);
});

test('the library does not offer an isolated frame as a sequence', () => {
  assert.equal(resolveCritteriumLibraryDrafts('MODULE_FRAME'), null);
  assert.equal(CRITTERIUM_LIBRARY_OPTIONS.some((item) => item.key === 'SINGLE_MODULE'), false);
});
