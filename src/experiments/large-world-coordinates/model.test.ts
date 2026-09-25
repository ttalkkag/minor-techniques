import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initial, step, rebase, relative, ulp } from './model.ts';
test('repeated small increments can disappear from persistent float state', () => {
    let state = initial(20);
    for (let i = 0; i < 100; i++) state = step(state, 0.03, 'float');
    assert.equal(state.local, 2 ** 20);
    assert.ok(state.requested - state.start > 2.99);
    assert.equal(ulp(2 ** 20), 0.125);
});
test('subtracting camera before float conversion preserves double state offset', () => {
    const state = step(initial(20), 0.03, 'double');
    assert.equal(relative(state, false), 0);
    assert.ok(Math.abs(relative(state, true) - 0.03) < 1e-8);
});
test('rebasing preserves world position and obstacle separation, omitted collider breaks it', () => {
    const before = step(initial(20), 0.1, 'double'),
        after = rebase(before, false);
    assert.equal(after.origin + after.local, before.origin + before.local);
    assert.equal(after.obstacle - after.local, before.obstacle - before.local);
    assert.ok(rebase(before, true).obstacle - after.local > 1000000);
    assert.ok(step(rebase(initial(20), false), 0.03, 'float').local > 0.029);
});
