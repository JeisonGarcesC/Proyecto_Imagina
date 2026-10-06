import test from 'node:test';
import assert from 'node:assert/strict';
import { CRITTERIUM_OFFICE_TEMPLATES, createCritteriumOfficeSequenceDraft } from '../src/mepal/critterium8/integration/critteriumOfficeTemplates.js';
import { validateCritteriumSequenceDraft, validateCritteriumSystemDraft } from '../src/mepal/critterium8/integration/critterium8Configurator.js';

test('office templates respect the physical sequence minimum and commercial validation', () => {
  assert.equal(CRITTERIUM_OFFICE_TEMPLATES.find((item) => item.key === 'EMPTY_SYSTEM').sequenceCount, 0);
  assert.equal(CRITTERIUM_OFFICE_TEMPLATES.find((item) => item.key === 'SINGLE_MODULE').available, false);
  for (const count of [2, 3]) {
    const draft = createCritteriumOfficeSequenceDraft(count);
    assert.equal(draft.frames.length, count);
    assert.equal(validateCritteriumSequenceDraft(draft).success, true);
    assert.equal(validateCritteriumSystemDraft([draft]).success, true);
  }
  assert.throws(() => createCritteriumOfficeSequenceDraft(1), /UNSUPPORTED_MODULE_COUNT/);
});

test('office templates clone frame configurations instead of sharing mutable frame state', () => {
  const draft = createCritteriumOfficeSequenceDraft(3);
  draft.frames[0].widthCm = 120;
  assert.notEqual(draft.frames[1].widthCm, 120);
});
