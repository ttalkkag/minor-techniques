import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, coverBlocks, defaults, evaluate, sample } from './model.ts';
test('120 ms at 5 m/s creates 0.6 m error; consistent history hits', () => {
    const result = evaluate(defaults);
    assert.ok(Math.abs(result.current - result.aim - 0.6) < 1e-10);
    assert.equal(result.hit, true);
    const current = evaluate({ ...defaults, mode: 'current' });
    assert.equal(current.hit, false);
    assert.equal(current.blocked, false);
    assert.equal(current.outcome, '표적 빗나감');
});
test('the fixed cover hides the current target while the earlier target remains visible', () => {
    const result = evaluate(defaults);
    assert.equal(result.hit, true);
    assert.equal(result.currentCovered, true);
    assert.equal(result.visibleCovered, false);
    assert.equal(coverBlocks(3.4), false);
    assert.equal(coverBlocks(4), true);
});
test('cover intersection includes entry through its side and rejects rays beyond either edge', () => {
    const aim = 3.47;
    const frontX = arena.shooterX + ((aim - 4 - arena.shooterX) * (arena.coverFrontZ - arena.shooterZ)) / (arena.targetZ - arena.shooterZ);
    assert.ok(frontX < arena.coverMinX);
    assert.equal(coverBlocks(aim), true);
    assert.equal(coverBlocks(2), false);
    assert.equal(coverBlocks(8), true);
    assert.equal(coverBlocks(9), false);
});
test('aiming behind fixed cover blocks the same ray regardless of history policy', () => {
    for (const mode of ['history', 'current'] as const) {
        const result = evaluate({ ...defaults, mode }, false, 0.6);
        assert.equal(result.aim, 4);
        assert.equal(result.blocked, true);
        assert.equal(result.hit, false);
        assert.equal(result.outcome, '엄폐물에 막힘');
        assert.equal(result.visibleCovered, false);
    }
});
test('subtick interpolates continuous motion but does not blend through a teleport', () => {
    assert.ok(Math.abs(sample(1010, 60, 5, true, false).alpha - 0.6) < 1e-10);
    const before = sample(905, 60, 5, true, true),
        after = sample(912, 60, 5, true, true);
    assert.equal(before.discontinuous, true);
    assert.ok(after.x - before.x > 2);
});
test('sample time identifies the stored position used when interpolation is unavailable', () => {
    const interpolated = sample(880, 10, 5, true, false);
    assert.equal(interpolated.sampleTime, 880);
    const stored = sample(880, 10, 5, false, false);
    assert.equal(stored.sampleTime, 800);
    assert.equal(stored.x, 3);
    const beforeTeleport = sample(905, 10, 5, true, true);
    const afterTeleport = sample(920, 10, 5, true, true);
    assert.equal(beforeTeleport.sampleTime, 900);
    assert.equal(beforeTeleport.x, 3.5);
    assert.equal(afterTeleport.sampleTime, 1000);
    assert.equal(afterTeleport.x, 6);
    const clamped = evaluate({ ...defaults, window: 75, limit: 'clamp', subtick: false, hz: 10 });
    assert.equal(clamped.q, 925);
    assert.equal(clamped.past.sampleTime, 900);
});
test('history limits, duplicate sequence and forged times are enforced', () => {
    assert.match(evaluate({ ...defaults, window: 50 }).reason, /이력/);
    assert.equal(evaluate({ ...defaults, window: 50, limit: 'clamp' }).q, 950);
    assert.match(evaluate(defaults, true).reason, /중복/);
    assert.match(evaluate({ ...defaults, claim: 'future' }).reason, /미래/);
    assert.match(evaluate({ ...defaults, claim: 'forged' }).reason, /예산/);
    assert.equal(evaluate({ ...defaults, up: 120, down: 20, clock: 'half' }).hit, false);
});
test('aim offset moves the shot without changing historical target samples', () => {
    const centered = evaluate(defaults);
    const shifted = evaluate(defaults, false, -0.5);
    assert.equal(centered.hit, true);
    assert.equal(shifted.aim, centered.aim - 0.5);
    assert.equal(shifted.queryX, centered.queryX);
    assert.equal(shifted.hit, false);
    assert.equal(shifted.blocked, false);
});
