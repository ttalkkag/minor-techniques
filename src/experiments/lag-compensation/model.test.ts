import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, evaluate, sample } from './model.ts';
test('120 ms at 5 m/s creates 0.6 m error; consistent history hits', () => {
    const result = evaluate({ ...defaults, door: 'none' });
    assert.ok(Math.abs(result.current - result.aim - 0.6) < 1e-10);
    assert.equal(result.hit, true);
    assert.equal(evaluate({ ...defaults, door: 'none', mode: 'current' }).hit, false);
});
test('a present door mixed with historical target constructs an inconsistent scene', () => {
    assert.equal(evaluate(defaults).hit, true);
    assert.equal(evaluate({ ...defaults, mode: 'mixed' }).blocked, true);
    assert.equal(evaluate({ ...defaults, door: 'opening' }).blocked, true);
    assert.equal(evaluate({ ...defaults, mode: 'mixed', door: 'opening' }).hit, true);
});
test('subtick interpolates continuous motion but does not blend through a teleport', () => {
    assert.ok(Math.abs(sample(1010, 60, 5, true, false).alpha - 0.6) < 1e-10);
    const before = sample(905, 60, 5, true, true),
        after = sample(912, 60, 5, true, true);
    assert.equal(before.discontinuous, true);
    assert.ok(after.x - before.x > 2);
});
test('history limits, duplicate sequence and forged times are enforced', () => {
    assert.match(evaluate({ ...defaults, window: 50 }).reason, /이력/);
    assert.equal(evaluate({ ...defaults, window: 50, limit: 'clamp' }).q, 950);
    assert.match(evaluate(defaults, true).reason, /중복/);
    assert.match(evaluate({ ...defaults, claim: 'future' }).reason, /미래/);
    assert.match(evaluate({ ...defaults, claim: 'forged' }).reason, /예산/);
    assert.equal(evaluate({ ...defaults, up: 120, down: 20, door: 'none', clock: 'half' }).hit, false);
});
