import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perlin, gradient, worley, hash, field, density } from './model.ts';
test('내적의 단순 합과 fade 보간을 구분한다', () => {
    const p = perlin(0.25, 0.5, 7, true);
    assert.equal(
        p.dots.reduce((s, n) => s + n, 0),
        -1,
    );
    assert.equal(p.value, 0.146484375);
    assert.equal(
        p.weights.reduce((s, n) => s + n, 0),
        1,
    );
});
test('음수 셀 경계에서 값과 변화율이 이어진다', () => {
    const e = 1e-5,
        a = perlin(-1 - e, 0.37, 5).value,
        b = perlin(-1, 0.37, 5).value,
        c = perlin(-1 + e, 0.37, 5).value;
    assert.ok(Math.abs((b - a) / e - (c - b) / e) < 0.001);
    assert.ok(Math.abs(Math.hypot(...gradient(-1, 0, 5)) - 1) < 1e-12);
});
test('이웃 하한으로 종료한 F1/F2가 넓은 후보 전수 검색과 같다', () => {
    let missed = false;
    for (const [x, y] of [
        [0.99, 0.05],
        [-0.02, 0.7],
        [1.8, -1.01],
    ]) {
        const result = worley(x, y, 7),
            all: number[] = [];
        for (let i = -5; i <= 6; i++)
            for (let j = -6; j <= 5; j++) all.push(Math.hypot(i + hash(i, j, 7) - x, j + hash(i, j, 26) - y));
        all.sort((a, b) => a - b);
        assert.ok(Math.abs(result.f1 - all[0]) < 1e-12);
        assert.ok(Math.abs(result.f2 - all[1]) < 1e-12);
        if (worley(x, y, 7, true).f1 > result.f1) missed = true;
    }
    assert.ok(missed);
});
test('옥타브 한 개는 기본 함수이고 진폭 정규화는 범위를 유지한다', () => {
    assert.equal(field(0.2, 0.7, 4, 'gradient', 1, 0.5, 0), perlin(0.2, 0.7, 4).value * 1.7);
    for (let n = 1; n < 6; n++) assert.ok(Math.abs(field(0.2, 0.7, 4, 'gradient', n, 0.5, 0)) < 1);
});
test('밀도 변환은 F2−F1의 큰 값도 0–1 범위로 제한한다', () => {
    const value = field(-0.65, 1.65, 2, 'f2', 1, 0.5, 0);
    assert.ok(value > 1);
    assert.equal(density(value, 0.8), 1);
    assert.equal(density(-0.5, 0.2), 0);
    assert.ok(Math.abs(density(0.6, 0.2) - 0.5) < 1e-12);
    for (const threshold of [-0.8, 0, 0.8])
        for (const sample of [-2, -1, 0, 1, 2])
            assert.ok(density(sample, threshold) >= 0 && density(sample, threshold) <= 1);
});
