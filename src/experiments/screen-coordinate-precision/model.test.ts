import { test } from 'node:test';
import assert from 'node:assert/strict';
import { project, quantize } from './model.ts';
test('different continuous positions stay in the same pixel until a boundary', () => {
    assert.equal(quantize({ x: 10.1, y: 0 }, 1).x, 10);
    assert.equal(quantize({ x: 10.9, y: 0 }, 1).x, 10);
    assert.equal(quantize({ x: 11.1, y: 0 }, 1).x, 11);
});
test('floor of negative coordinates is not truncation and error stays inside cell', () => {
    assert.equal(quantize({ x: -0.1, y: 0 }, 1).x, -1);
    for (let x = -20; x < 20; x += 0.037) {
        const q = quantize({ x, y: x }, 0.25);
        assert.ok(x - q.x >= 0 && x - q.x < 0.25);
    }
});
test('projection responds continuously to small camera movement and depth', () => {
    assert.ok(Math.abs(project(-1, 0.6, 4, 0.005).x - project(-1, 0.6, 4, 0).x + 0.0875) < 1e-10);
    assert.equal(project(1, 0, 4, 0).x - 80, 2 * (project(1, 0, 8, 0).x - 80));
});
