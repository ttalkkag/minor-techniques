import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meanC, calibrate, initial, draw, coinReward } from './model.ts';
test('cumulative constant changes long-run frequency and calibrated constant restores it', () => {
    assert.equal(meanC(0.25), 2.21875);
    assert.ok(Math.abs(1 / meanC(calibrate(0.25)) - 0.25) < 1e-10);
});
test('hard ceiling bounds consecutive failures and bags preserve composition', () => {
    let a = initial(),
        b = initial();
    for (let i = 0; i < 1000; i++) {
        a = draw(a, 'ceiling', 0.25, 4, 0.25);
        b = draw(b, 'bag', 0.25, 4, 0.25);
        assert.ok(a.failures < 4);
        if ((i + 1) % 20 === 0) assert.equal(b.successes, (i + 1) / 4);
    }
    assert.ok(b.longest <= 30);
});
test('revealing same fair coin changes achievable policy reward', () => {
    assert.equal((coinReward(true, true) + coinReward(false, true)) / 2, 1);
    assert.equal((coinReward(true, true) + coinReward(false, false)) / 2, 5.5);
});
