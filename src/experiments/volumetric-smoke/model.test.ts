import test from 'node:test';
import assert from 'node:assert/strict';
import { integrate, viewRay, density, billboard, rayInterval } from './model.ts';
import type { DensityState } from './model.ts';
const state: DensityState = { shape: 'uniform', beta: 0.5, hole: false, holeRadius: 0.2, drift: 0 };
test('Beer-Lambert transmittance is independent of uniform subdivision', () => {
    const { origin, direction } = viewRay(0, 0, 0);
    for (const n of [10, 20, 80]) {
        const result = integrate(origin, direction, state, n);
        assert.ok(Math.abs(result.transmission - Math.exp(-1)) < 1e-12);
        assert.ok(Math.abs(result.transmission + result.emission - 1) < 1e-12);
    }
});
test('fixed alpha changes the medium when quality changes', () => {
    const { origin, direction } = viewRay(0, 0, 0);
    assert.ok(Math.abs(integrate(origin, direction, state, 10, 'fixed').transmission - 0.9 ** 10) < 1e-12);
    assert.ok(Math.abs(integrate(origin, direction, state, 20, 'fixed').transmission - 0.9 ** 20) < 1e-12);
});
test('one world-space hole has different view-dependent path lengths', () => {
    const hole = { ...state, hole: true };
    const a = viewRay(0.12, 0, 0),
        b = viewRay(0.12, 0, 75);
    assert.equal(integrate(a.origin, a.direction, hole, 256).transmission, 1);
    assert.ok(integrate(b.origin, b.direction, hole, 256).transmission < 0.6);
    assert.equal(density({ x: 0.12, y: 0, z: 0.8 }, hole), 0);
});
test('rays outside the bounds are transparent; billboard is angle independent', () => {
    const ray = viewRay(2, 0, 0);
    assert.equal(rayInterval(ray.origin, ray.direction), null);
    assert.equal(integrate(ray.origin, ray.direction, state, 20).transmission, 1);
    assert.ok(billboard(0, 0, state) > 0 && billboard(0, 0, state) < 1);
});
