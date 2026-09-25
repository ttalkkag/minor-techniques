import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replay, type Config } from './model.ts';
const c: Config = { alpha: 0.1, low: 0.2, high: 0.6, interval: 1, hold: 3, initial: 3 };
test('EMA example and convex bounds', () => {
    assert.ok(Math.abs(replay([1], c)[0]!.mean - 0.28) < 1e-12);
    for (const r of replay(
        Array.from({ length: 100 }, (_, i) => i % 2),
        c,
    ))
        assert.ok(r.mean >= 0 && r.mean <= 1);
});
test('hysteresis strict boundaries and minimum hold block oscillation', () => {
    assert.equal(replay([1], { ...c, alpha: 0.5, high: 0.6 })[0]!.level, 3);
    const r = replay([1, 0, 1, 0], { ...c, alpha: 1 });
    assert.deepEqual(
        r.map((x) => x.level),
        [2, 2, 2, 3],
    );
    assert.equal(r[1]!.reason, '최소 유지 시간');
});
test('interval and bounds separate constraints', () => {
    const r = replay(Array(20).fill(1), { ...c, alpha: 1, interval: 2, hold: 0 });
    assert.equal(r[0]!.reason, '재평가 간격 대기');
    assert.equal(r.at(-1)!.level, 1);
    assert.equal(r.at(-1)!.reason, '난이도 상하한');
});
