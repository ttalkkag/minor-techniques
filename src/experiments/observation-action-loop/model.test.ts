import assert from 'node:assert/strict';
import test from 'node:test';
import { cycle, freshBuild, buildBatch, rollback } from './model.ts';
const initial = { tick: 0, x: 1, map: '마을' as const, delivered: false, interrupted: false };
test('stale map observation is rejected before command transmission', () => {
    const safe = cycle(initial, 3, 6, true, true, 1),
        naive = cycle(initial, 3, 6, false, true, 1);
    assert.equal(safe.sent, 0);
    assert.equal(naive.moved, 0);
    assert.equal(naive.claimed, true);
    assert.equal(naive.world.delivered, false);
});
test('completed objective is not executed again', () => {
    const r = cycle({ ...initial, x: 8, delivered: true }, 0, 4, true, false, 1);
    assert.equal(r.sent, 0);
    assert.equal(r.claimed, true);
});
test('difference retry finishes remaining cells and guarded rollback preserves concurrent edit', () => {
    let state = buildBatch(freshBuild(), true);
    assert.equal(state.blocks.filter((v) => v === '벽').length, 6);
    state.stock = 4;
    state = buildBatch(state, true);
    assert.equal(state.blocks.filter((v) => v === '벽').length, 10);
    state.blocks[2] = '나무';
    state.versions[2]++;
    const rolled = rollback(state, true);
    assert.equal(rolled.blocks[2], '나무');
    assert.equal(rolled.conflicts, 1);
});
