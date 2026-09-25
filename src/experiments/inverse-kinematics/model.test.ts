import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analytic, fabrik, distance } from './model.ts';
test('both bone lengths remain invariant for unreachable near and far targets', () => {
    for (const target of [
        { x: 0, y: 0 },
        { x: 0, y: 0.02 },
        { x: 2, y: 2 },
        { x: 0.2, y: 0.6 },
    ])
        for (const pole of [-1, 1]) {
            const r = analytic({ x: 0, y: 0 }, target, 0.5, 0.4, pole);
            assert.ok(Math.abs(distance({ x: 0, y: 0 }, r.knee) - 0.5) < 1e-8);
            assert.ok(Math.abs(distance(r.knee, r.foot) - 0.4) < 1e-8);
        }
});
test('two pole choices reach same target with opposite knees', () => {
    const a = analytic({ x: 0, y: 0 }, { x: 0, y: 0.6 }, 0.5, 0.4, 1),
        b = analytic({ x: 0, y: 0 }, { x: 0, y: 0.6 }, 0.5, 0.4, -1);
    assert.equal(a.knee.x, -b.knee.x);
    assert.deepEqual(a.foot, b.foot);
});
test('equal bones folded onto the root preserve the selected knee side', () => {
    const root = { x: 0.2, y: 0.3 };
    for (const pole of [-1, 1]) {
        const result = analytic(root, root, 0.5, 0.5, pole);
        assert.equal(Math.sign(result.knee.x - root.x), -pole);
        assert.deepEqual(result.foot, root);
        assert.equal(result.error, 0);
        assert.equal(result.clamped, false);
        assert.ok(Math.abs(distance(root, result.knee) - 0.5) < 1e-8);
        assert.ok(Math.abs(distance(result.knee, result.foot) - 0.5) < 1e-8);
    }
});
test('FABRIK reduces error with iterations without stretching', () => {
    const a = fabrik({ x: 0, y: 0 }, { x: 0.35, y: 0.6 }, 0.5, 0.4, 1, 1),
        b = fabrik({ x: 0, y: 0 }, { x: 0.35, y: 0.6 }, 0.5, 0.4, 1, 30);
    assert.ok(b.error < a.error);
    assert.ok(b.error < 1e-6);
    assert.ok(Math.abs(distance(b.knee, b.foot) - 0.4) < 1e-8);
});
test('a target coinciding with the initial knee never collapses a bone', () => {
    for (const iterations of [1, 4, 32]) {
        const r = fabrik({ x: 0, y: 0 }, { x: -0.5, y: 0 }, 0.5, 0.8, 1, iterations);
        assert.ok(Math.abs(distance({ x: 0, y: 0 }, r.knee) - 0.5) < 1e-8);
        assert.ok(Math.abs(distance(r.knee, r.foot) - 0.8) < 1e-8);
        assert.equal(r.error, distance(r.foot, { x: -0.5, y: 0 }));
    }
    assert.ok(fabrik({ x: 0, y: 0 }, { x: -0.5, y: 0 }, 0.5, 0.8, 1, 32).error < 1e-6);
});
