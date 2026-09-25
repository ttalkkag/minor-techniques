import { test } from 'node:test';
import assert from 'node:assert/strict';
import { correct, liftBonus, sweptBlocked } from './model.ts';
test('nearby clear space preserves upward motion only inside correction limit', () => {
    const a = { x: 72, y: 90, w: 30, h: 40 },
        wall = { x: 100, y: 20, w: 100, h: 65 };
    assert.equal(correct(a, 0, -12, 1, [wall]).success, false);
    const result = correct(a, 0, -12, 2, [wall]);
    assert.equal(result.offset, -2);
    assert.equal(result.y, 78);
});
test('a clear destination cannot tunnel through a thin blocker', () => {
    assert.equal(sweptBlocked({ x: 0, y: 0, w: 2, h: 2 }, 10, 0, [{ x: 5, y: 0, w: 1, h: 2 }]), true);
});
test('stored lift momentum expires and cannot transfer across platforms', () => {
    assert.equal(liftBonus(30, 0, 50, 3, true), 3);
    assert.equal(liftBonus(30, 0, 20, 3, true), 0);
    assert.equal(liftBonus(30, 0, 50, 3, false), 0);
});
