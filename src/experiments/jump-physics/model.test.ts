import { test } from 'node:test';
import assert from 'node:assert/strict';
import { integrate, brake, cutJump, jumpSamples } from './model.ts';
test('first step distinguishes analytic explicit and semi-implicit integration', () => {
    assert.equal(integrate(0, 10, -20, 0.1, 'analytic').y, 0.9);
    assert.equal(integrate(0, 10, -20, 0.1, 'explicit').y, 1);
    assert.equal(integrate(0, 10, -20, 0.1, 'semi').y, 0.8);
});
test('semi-implicit error follows a t h / 2 at fixed samples', () => {
    let y = 0,
        v = 10;
    for (let i = 0; i < 5; i++) {
        const next = integrate(y, v, -20, 0.1, 'semi');
        y = next.y;
        v = next.v;
    }
    assert.ok(Math.abs(y - 2.5 - -0.5) < 1e-10);
});
test('release during falling does not cut falling velocity and braking never reverses', () => {
    assert.equal(cutJump(-5, 2), -5);
    assert.equal(cutJump(8, 2), 2);
    assert.equal(brake(0.1, 0.5), 0);
    assert.equal(brake(-0.1, 0.5), 0);
});
test('smaller physics step reduces apex error, short press reduces height', () => {
    const rough = jumpSamples(0.1, 'semi', 1, 99, 3),
        fine = jumpSamples(1 / 120, 'semi', 1, 99, 3),
        cut = jumpSamples(1 / 120, 'semi', 1, 0.1, 3);
    assert.ok(Math.abs(fine.peak - 2.5) < Math.abs(rough.peak - 2.5));
    assert.ok(cut.peak < fine.peak);
});
test('immediate zero-height release never produces below-ground samples', () => {
    const result = jumpSamples(1 / 60, 'semi', 1, 0, 0);
    assert.ok(result.points.every((point) => point.y >= 0));
    assert.equal(result.peak, 0);
});

test('roundoff at ground contact does not add a physics tick to landing', () => {
    for (const hz of [10, 30, 60, 120]) {
        const h = 1 / hz;
        for (const method of ['analytic', 'explicit', 'semi'] as const) {
            const expected = 1 + (method === 'explicit' ? h : method === 'semi' ? -h : 0);
            assert.ok(Math.abs(jumpSamples(h, method, 1, 99, 3).landing - expected) < 1e-10);
        }
    }
});

test('release at an exact tick boundary is not delayed by accumulated time roundoff', () => {
    for (const [hz, release] of [[30, 0.2], [60, 0.1], [120, 0.05]]) {
        const expectedPeak = 10 * release - 10 * release * release;
        assert.ok(Math.abs(jumpSamples(1 / hz, 'analytic', 1, release, 0).peak - expectedPeak) < 1e-10);
    }
    const offTick = jumpSamples(1 / 60, 'analytic', 1, 0.125, 0);
    assert.ok(Math.abs(offTick.peak - (10 * (8 / 60) - 10 * (8 / 60) ** 2)) < 1e-10);
});

test('roundoff at the apex does not trigger falling gravity one tick early', () => {
    for (const hz of [10, 30, 60, 120]) {
        const h = 1 / hz;
        const point = jumpSamples(h, 'analytic', 3, 99, 3).points[hz / 2 + 1];
        assert.ok(Math.abs(point.y - (2.5 - 10 * h * h)) < 1e-10);
    }
});
