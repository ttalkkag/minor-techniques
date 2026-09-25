import { test } from 'node:test';
import assert from 'node:assert/strict';
import { depth, storeDepth, comparePlates } from './model.ts';
test('projection maps clipping endpoints and maintains complementary depth', () => {
    assert.equal(depth(1, 1, 100, false), 0);
    assert.equal(depth(100, 1, 100, true), 0);
    assert.equal(depth(1, 1, 100, true), 1);
    for (const z of [2, 10, 90])
        assert.ok(Math.abs(depth(z, 1, 100, true) + depth(z, 1, 100, false) - 1) < 1e-14);
});
test('reversal cannot recover uniform integer bins, float reversal preserves distant surfaces', () => {
    assert.equal(storeDepth(depth(10, 1, 100, false), '3'), storeDepth(depth(11, 1, 100, false), '3'));
    assert.equal(storeDepth(depth(10, 1, 100, true), '3'), storeDepth(depth(11, 1, 100, true), '3'));
    assert.equal(comparePlates(5000, 0.01, 0.1, 100000, 'float', false, true).tied, true);
    assert.equal(comparePlates(5000, 0.01, 0.1, 100000, 'float', true, true).tied, false);
});
test('strict depth ties depend on draw order and coincident geometry remains tied', () => {
    assert.equal(comparePlates(5000, 0, 0.1, 100000, 'float', true, true).rearVisible, true);
    assert.equal(comparePlates(5000, 0, 0.1, 100000, 'float', true, false).rearVisible, false);
});
test('fragments rounded to the clear depth fail the first strict comparison in either order', () => {
    for (const reversed of [false, true])
        for (const rearFirst of [false, true]) {
            const result = comparePlates(5000, 0.01, 0.1, 100000, '8', reversed, rearFirst);
            assert.equal(result.visible, null);
            assert.equal(result.tied, true);
            assert.equal(result.clearRejected, true);
        }
});
test('clipping precedes the strict depth test and a surviving rear plate can be visible', () => {
    for (const reversed of [false, true]) {
        assert.equal(comparePlates(0.9, 0.2, 1, 100, 'float', reversed, true).visible, 'back');
        assert.equal(comparePlates(0.2, 0.1, 1, 100, 'float', reversed, true).visible, null);
        assert.equal(comparePlates(99, 2, 1, 100, 'float', reversed, true).visible, 'front');
        assert.equal(comparePlates(100, 0, 1, 100, 'float', reversed, true).visible, null);
        assert.equal(comparePlates(1, 0, 1, 100, 'float', reversed, true).visible, 'back');
        assert.equal(comparePlates(1, 0, 1, 100, 'float', reversed, false).visible, 'front');
    }
});
