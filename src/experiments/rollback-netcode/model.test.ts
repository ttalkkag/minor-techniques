import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, initial, defaults, simulate, hash } from './model.ts';
test('one tick is deterministic and leaves its input snapshot intact', () => {
    const start = initial(),
        before = hash(start),
        inputs: [{ move: number; attack: boolean }, { move: number; attack: boolean }] = [
            { move: 1, attack: true },
            { move: -1, attack: false },
        ];
    assert.deepEqual(advance(start, inputs), advance(start, inputs));
    assert.equal(hash(start), before);
});
test('delayed inputs restore and replay to the same confirmed state', () => {
    for (const delay of [0, 2, 6, 10]) {
        const result = simulate(40, { ...defaults, delay });
        assert.equal(result.confirmedHash, result.referenceHash);
        if (delay) assert.ok(result.replayed > 0);
    }
});
test('event identifiers suppress repeated effect requests during actual resimulation', () => {
    const safe = simulate(30, defaults),
        naive = simulate(30, { ...defaults, dedupe: false });
    assert.ok(safe.duplicateRequests > 0);
    assert.ok(naive.played > safe.played);
    assert.equal(safe.confirmedHash, naive.confirmedHash);
});
test('omitted RNG state breaks confirmed state while bounded prediction waits', () => {
    const broken = simulate(35, { ...defaults, restoreRng: false });
    assert.notEqual(broken.confirmedHash, broken.referenceHash);
    assert.ok(simulate(24, { ...defaults, delay: 10, horizon: 3 }).waits > 0);
    assert.ok(simulate(24, { ...defaults, inputDelay: 6 }).replayed < simulate(24, defaults).replayed);
});
