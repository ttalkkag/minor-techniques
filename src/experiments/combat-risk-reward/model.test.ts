import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initial, counter, hit, wait, reward, riskMoments } from './model.ts';
test('recoverable budget pays 12 then 8, expires exactly at T, never revives', () => {
    let s = counter(initial());
    assert.equal(s.hp, 52);
    s = counter(s);
    assert.equal(s.hp, 60);
    assert.equal(counter(s).hp, 60);
    assert.equal(counter({ ...initial(), time: 3 }).hp, 40);
    assert.equal(counter({ ...initial(), hp: 0 }).hp, 0);
    assert.equal(hit({ ...initial(), hp: 20 }, 20, 3).recoverable, 0);
});
test('new damage replaces budget and one target rewards only once', () => {
    const s = hit(initial(), 10, 5);
    assert.equal(s.recoverable, 10);
    assert.equal(s.expires, 5);
    const r = reward(initial(), 'health');
    assert.equal(reward(r, 'ammo').ammo, 8);
    assert.equal(reward({ ...initial(), hp: 95 }, 'health').hp, 100);
});
test('passive recovery has delay, cap and pressure; expected equal means differ in variance', () => {
    assert.equal(wait(initial(), true, 0).hp, 40);
    assert.equal(wait({ ...initial(), time: 2 }, true, 0).hp, 46);
    assert.equal(wait({ ...initial(), time: 8, hp: 80 }, true, 2).hp, 78);
    assert.deepEqual(riskMoments(0.5, 20, 10, 0), { mean: 5, variance: 225 });
});
