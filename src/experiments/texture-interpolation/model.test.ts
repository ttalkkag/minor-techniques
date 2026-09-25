import assert from 'node:assert/strict';
import test from 'node:test';
import { interpolate, mesh, project, sample, uvError } from './model.ts';

test('screen midpoint differs from perspective midpoint when depth differs', () => {
    const triangle = mesh({ tilt: 0, yaw: 0, distance: 4 }, 1, 'world')[0];
    triangle[0] = { x: 0, y: 0, w: 1, u: 0, v: 0 };
    triangle[1] = { x: 1, y: 0, w: 4, u: 1, v: 0 };
    assert.equal(interpolate(triangle, [0.5, 0.5, 0], 'affine').u, 0.5);
    assert.equal(interpolate(triangle, [0.5, 0.5, 0], 'perspective').u, 0.2);
});

test('perspective interpolation recovers original 3D plane UV after projection', () => {
    const conditions = { tilt: 68, yaw: 23, distance: 4.5 };
    const triangles = mesh(conditions, 1, 'world');
    for (const [u, v] of [
        [0.1, 0.3],
        [0.72, 0.61],
        [0.5, 0.5],
    ]) {
        const result = sample(project(u, v, conditions), triangles, 'perspective');
        assert.ok(result);
        assert.ok(Math.hypot(result.u - u, result.v - v) < 1e-12);
    }
});

test('equal-depth control has no affine error', () => {
    const conditions = { tilt: 0, yaw: 0, distance: 5 };
    assert.ok(uvError(conditions, mesh(conditions, 1, 'world'), 'affine') < 1e-12);
});

test('3D subdivision reduces error while screen subdivision preserves it', () => {
    const conditions = { tilt: 65, yaw: 12, distance: 4.5 };
    const original = uvError(conditions, mesh(conditions, 1, 'world'), 'affine');
    const divided = mesh(conditions, 8, 'world');
    const screen = mesh(conditions, 8, 'screen');
    assert.equal(divided.length, 128);
    assert.equal(screen.length, 128);
    assert.ok(uvError(conditions, divided, 'affine') < original / 20);
    assert.ok(Math.abs(uvError(conditions, screen, 'affine') - original) < 1e-12);
});
