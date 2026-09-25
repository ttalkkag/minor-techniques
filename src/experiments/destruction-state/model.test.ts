import test from 'node:test';
import assert from 'node:assert/strict';
import { initialWall, strike, blocked, tickWall } from './model.ts';
test('a partial fracture opens only the hit cell across all synchronized states', () => {
    const wall = initialWall();
    strike(wall, 0.5, 50, 'fracture', 'sync', false);
    assert.ok(blocked(wall.visual, 0.5));
    strike(wall, 0.5, 50, 'fracture', 'sync', false);
    for (const field of [wall.visual, wall.collision, wall.nav]) {
        assert.equal(blocked(field, 0.5), false);
        assert.ok(blocked(field, 0.2));
    }
});
test('visual-only and collision-first transitions reveal opposite mismatches', () => {
    for (const policy of ['visual', 'collision']) {
        const wall = initialWall();
        strike(wall, 0.5, 100, 'fracture', policy, false);
        assert.notEqual(blocked(wall.visual, 0.5), blocked(wall.collision, 0.5));
    }
});
test('delayed nav remains blocked for two ticks; large debris independently blocks', () => {
    const wall = initialWall();
    strike(wall, 0.5, 100, 'cut', 'delay', true);
    assert.equal(blocked(wall.collision, 0.5), false);
    assert.ok(blocked(wall.debris, 0.5));
    tickWall(wall);
    assert.ok(blocked(wall.nav, 0.5));
    tickWall(wall);
    assert.equal(blocked(wall.nav, 0.5), false);
});
test('model swap has a fixed opening while runtime cut follows impact', () => {
    const swap = initialWall(),
        cut = initialWall();
    strike(swap, 0.15, 100, 'swap', 'sync', false);
    strike(cut, 0.15, 100, 'cut', 'sync', false);
    assert.ok(blocked(swap.visual, 0.15));
    assert.equal(blocked(cut.visual, 0.15), false);
    assert.equal(blocked(swap.visual, 0.5), false);
    assert.ok(blocked(cut.visual, 0.5));
});
