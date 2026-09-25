import test from 'node:test';
import assert from 'node:assert/strict';
import { damp, confine, deadTarget } from './model.ts';
test('fixed-target exponential damping is independent of time subdivision', () => {
    let a = 0,
        b = 0;
    for (let i = 0; i < 30; i++) a = damp(a, 10, 0.2, 1 / 30);
    for (let i = 0; i < 60; i++) b = damp(b, 10, 0.2, 1 / 60);
    assert.ok(Math.abs(a - b) < 1e-12);
    assert.ok(Math.abs(a - 9.6875) < 1e-12);
});
test('confiner includes viewport edges and handles an oversized viewport', () => {
    assert.equal(confine(39, 0, 40, 20), 30);
    assert.equal(confine(-2, 0, 40, 20), 10);
    assert.equal(confine(5, 0, 40, 44), 20);
});
test('dead zone does not move the camera until target leaves its boundary', () => {
    assert.equal(deadTarget(4, 5, 2), 4);
    assert.equal(deadTarget(4, 8, 2), 6);
});
