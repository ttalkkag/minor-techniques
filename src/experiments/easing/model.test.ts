import test from 'node:test';
import assert from 'node:assert/strict';
import { cssParameter, easing, motion } from './model.ts';
test('CSS x inversion differs from substituting time as the parameter', () => {
    assert.ok(Math.abs(cssParameter(0.25, 0, 1) - 0.3263518223) < 1e-9);
    assert.ok(Math.abs(easing(0.25, 'css') - 0.034759) < 0.000001);
    assert.equal(easing(0.25, 'naive'), 0.015625);
});
test('halving duration doubles velocity and quadruples acceleration', () => {
    const slow = motion(0.25, 'smoother', 2, 5),
        fast = motion(0.25, 'smoother', 1, 5);
    assert.equal(slow.position, fast.position);
    assert.ok(slow.velocity !== null && slow.acceleration !== null);
    assert.equal(slow.velocity * 2, fast.velocity);
    assert.equal(slow.acceleration * 4, fast.acceleration);
});
test('smoothstep retains an acceleration jump while smootherstep approaches rest', () => {
    const smooth = motion(0.000001, 'smooth', 1, 1),
        smoother = motion(0.000001, 'smoother', 1, 1);
    assert.ok(smooth.acceleration !== null && smooth.acceleration > 5.99);
    assert.ok(smoother.acceleration !== null && smoother.acceleration < 0.0001);
    assert.deepEqual(motion(-0.1, 'linear', 1, 1), { position: 0, velocity: 0, acceleration: 0 });
});

test('CSS vertical tangent has a finite position but no finite time derivatives', () => {
    const result = motion(0.5, 'css', 2, 5, 1, 0);
    assert.equal(result.position, 0.625);
    assert.equal(result.velocity, null);
    assert.equal(result.acceleration, null);
});

test('CSS samples on either side of the vertical tangent retain finite signed derivatives', () => {
    const before = motion(0.499999, 'css', 2, 5, 1, 0);
    const after = motion(0.500001, 'css', 2, 5, 1, 0);
    for (const result of [before, after]) {
        assert.ok(result.velocity !== null && Number.isFinite(result.velocity) && result.velocity > 1000);
        assert.ok(result.acceleration !== null && Number.isFinite(result.acceleration));
    }
    assert.ok(before.acceleration !== null && before.acceleration > 0);
    assert.ok(after.acceleration !== null && after.acceleration < 0);
    assert.ok(before.position < 0.625 && after.position > 0.625);
    assert.equal(cssParameter(0.5, 1, 0), 0.5);
});
