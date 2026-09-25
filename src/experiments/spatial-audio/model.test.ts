import assert from 'node:assert/strict';
import test from 'node:test';
import { wallBlocks, directGain, doppler, coefficients } from './model.ts';
test('partial opening and transmission remain separate', () => {
    assert.equal(directGain(2, 8, 0.2), 0.4);
    assert.equal(directGain(2, 8, 0), 0.25);
});
test('a segment crossing above wall edge is open', () => {
    assert.equal(wallBlocks({ x: 8, y: 0 }, { x: 2, y: 0 }, 0.1), true);
    assert.equal(wallBlocks({ x: 8, y: 0 }, { x: 2, y: 0 }, -0.1), false);
});
test('distance changes level without forcing occlusion', () => {
    const c = coefficients({ x: 10, y: 0 }, { x: 1, y: 0 }, 0, 8, false, 0.2, false, 0, true);
    assert.equal(c.occlusion, 1);
    assert.ok(c.attenuation < 1);
    assert.equal(c.pitch, 1);
});
test('approach raises pitch, retreat lowers it, reset removes teleport velocity', () => {
    assert.ok(doppler(80, true) > 1);
    assert.ok(doppler(-80, true) < 1);
    assert.equal(doppler(1800, false), 1);
});
