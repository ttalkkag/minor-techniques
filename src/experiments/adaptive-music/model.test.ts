import assert from 'node:assert/strict';
import test from 'node:test';
import { nextBar, requestTransition } from './model.ts';
test('preparation horizon can miss the approaching bar', () => {
    assert.equal(nextBar(3.8, 120, 0.15), 4);
    assert.equal(nextBar(3.9, 120, 0.15), 6);
});
test('returning to playing state cancels obsolete reservation, with a counterexample toggle', () => {
    const pending = { id: 1, at: 4, target: 'combat' as const };
    assert.equal(requestTransition('calm', pending, 'calm', 2, 120, 0.15, true, true, 2), null);
    assert.equal(requestTransition('calm', pending, 'calm', 2, 120, 0.15, true, false, 2), pending);
    assert.equal(requestTransition('calm', pending, 'combat', 2, 120, 0.15, true, true, 2), pending);
});
