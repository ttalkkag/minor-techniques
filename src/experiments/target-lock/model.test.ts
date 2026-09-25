import test from 'node:test';
import assert from 'node:assert/strict';
import { basis, groupBounds } from './model.ts';
test('target movement axes are perpendicular unit vectors', () => {
    const { forward: f, right: r } = basis({ x: 0, z: 0 }, { x: 3, z: 4 });
    assert.ok(Math.abs(f.x * r.x + f.z * r.z) < 1e-10);
    assert.equal(Math.hypot(f.x, f.z), 1);
    assert.equal(Math.hypot(r.x, r.z), 1);
});
test('overlap keeps previous direction without NaN', () => {
    assert.deepEqual(basis({ x: 2, z: 2 }, { x: 2, z: 2 }, { x: 1, z: 0 }).forward, { x: 1, z: 0 });
});
test('large target radius expands group framing beyond midpoint bounds', () => {
    assert.deepEqual(groupBounds({ x: 0, z: 0 }, { x: 4, z: 0 }, 3, true), {
        left: -0.5,
        right: 7,
        bottom: -3,
        top: 3,
    });
});
