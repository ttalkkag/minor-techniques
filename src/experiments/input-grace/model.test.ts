import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canJump, consume, type GraceState } from './model.ts';
const state = (): GraceState => ({
    lastGround: 0,
    lastPress: 0.05,
    groundAvailable: true,
    inputAvailable: true,
    held: true,
});
test('late input is accepted on coyote boundary but not after it', () => {
    assert.equal(canJump(state(), 0.05, false, 0.05, 0, false), true);
    assert.equal(canJump(state(), 0.05, false, 0.049, 0, false), false);
});
test('jump consumes both input and ground permission so tapping cannot double jump', () => {
    const s = state();
    consume(s);
    s.lastPress = 0.06;
    s.inputAvailable = true;
    assert.equal(canJump(s, 0.06, false, 0.1, 0.1, false), false);
});
test('early input must remain inside buffer and optional held policy', () => {
    const s = state();
    assert.equal(canJump(s, 0.12, true, 0, 0.07, false), true);
    assert.equal(canJump(s, 0.121, true, 0, 0.07, false), false);
    s.held = false;
    assert.equal(canJump(s, 0.12, true, 0, 0.07, true), false);
});
