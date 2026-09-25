import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sample, safeWaves, strength } from './model.ts';
test('Q=0은 수평 위치를 유지하고 λ10 A1 Q2의 봉우리는 접힌다', () => {
    const wave = { a: 1, lambda: 10, q: 0, angle: 0 };
    assert.equal(sample(2, 3, 1, [wave]).x, 2);
    const p = sample(2.5, 0, 0, [{ ...wave, q: 2 }]);
    assert.ok(p.det < 0);
    assert.ok(Math.abs(p.det - (1 - (4 * Math.PI) / 10)) < 1e-12);
});
test('다중 파동 가파름 제한은 전체 수평 사상의 퇴화를 막는다', () => {
    const waves = safeWaves(
        [
            { a: 2, lambda: 5, q: 3, angle: 0 },
            { a: 1, lambda: 3, q: 2, angle: 1 },
        ],
        true,
    );
    assert.ok(strength(waves) < 1);
    for (let x = -4; x < 4; x += 0.3)
        for (let z = -4; z < 4; z += 0.4) assert.ok(sample(x, z, 0.3, waves).det > 0);
});
test('변형 법선은 수치 접선 두 개 모두에 수직이다', () => {
    const waves = [{ a: 1, lambda: 10, q: 0.7, angle: 0.4 }],
        p = sample(1, 2, 0.3, waves),
        u = sample(1.00001, 2, 0.3, waves),
        v = sample(1, 2.00001, 0.3, waves);
    for (const q of [u, v]) {
        const d = [q.x - p.x, q.y - p.y, q.z - p.z];
        assert.ok(Math.abs(d.reduce((s, a, i) => s + a * p.normal[i], 0)) < 1e-9);
    }
    assert.ok(Math.abs(Math.hypot(...p.normal) - 1) < 1e-12);
});
