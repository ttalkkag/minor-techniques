import { test } from 'node:test';
import assert from 'node:assert/strict';
import { basis, camera, dot, type V3 } from './model.ts';
test('three billboard bases stay orthonormal across camera orbits', () => {
    for (const a of [-180, -45, 0, 120])
        for (const e of [0, 35, 89, 90]) {
            for (const m of ['screen', 'point', 'axis'] as const) {
                const b = basis(m, [0, 1.5, 0], camera(a, e), true);
                assert.ok(Math.abs(dot(b.right, b.up)) < 1e-9);
                assert.ok(Math.abs(dot(b.normal, b.up)) < 1e-9);
                assert.ok(Math.abs(Math.hypot(...b.normal) - 1) < 1e-9);
            }
        }
});
test('point-facing tilts while axis-facing preserves vertical for (3,4,0)', () => {
    const c = { ...camera(0, 0), position: [3, 4, 0] as V3 };
    const p = basis('point', [0, 0, 0], c, true),
        y = basis('axis', [0, 0, 0], c, true);
    assert.deepEqual(p.normal, [0.6000000000000001, 0.8, 0]);
    assert.deepEqual(y.normal, [1, 0, 0]);
    assert.equal(y.up[1], 1);
});
test('overhead uses previous valid direction but cannot restore projected area', () => {
    const c = camera(0, 90),
        b = basis('axis', [0, 1.5, 0], c, true, [1, 0, 0]);
    assert.equal(b.degenerate, true);
    assert.equal(b.valid, true);
    assert.deepEqual(b.normal, [1, 0, 0]);
    assert.ok(Math.abs(dot(b.normal, c.normal)) < 1e-9);
    assert.equal(basis('axis', [0, 1.5, 0], c, false).valid, false);
});
