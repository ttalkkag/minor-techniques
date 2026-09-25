import { test } from 'node:test';
import assert from 'node:assert/strict';
import { next, initial, step, weighted, rangeCounts } from './model.ts';
test('seed five known vector and checkpoint continuation', () => {
    let s = 5;
    const a = [];
    for (let i = 0; i < 5; i++) {
        s = next(s);
        a.push(s);
    }
    assert.deepEqual(a, [10, 3, 0, 1, 6]);
    assert.equal(next(10), 3);
    assert.equal(next(5), 10);
});
test('decoration changes shared combat but not separated streams', () => {
    const a = step(initial(5), false, false, 4),
        b = step(initial(5), true, false, 4),
        c = step(initial(5), true, true, 4);
    assert.equal(a.hit, false);
    assert.equal(b.hit, true);
    assert.equal(c.value, a.value);
    assert.equal(c.run.state, a.run.state);
});
test('weighted intervals and modulo conversion remain explicit', () => {
    assert.deepEqual(rangeCounts(false), [6, 5, 5]);
    assert.deepEqual(rangeCounts(true), [5, 5, 5]);
    assert.equal(weighted(7, [8, 4, 4]), 0);
    assert.equal(weighted(8, [8, 4, 4]), 1);
    assert.equal(weighted(15, [8, 4, 4]), 2);
});
