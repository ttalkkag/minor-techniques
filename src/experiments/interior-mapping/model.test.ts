import test from 'node:test';
import assert from 'node:assert/strict';
import { intersectRoom, trace } from './model.ts';
test('axis-parallel center ray hits back without NaN; oblique ray hits side first', () => {
    assert.deepEqual(intersectRoom([0, 0, 0], [0, 0, 1], 3)?.point, [0, 0, 3]);
    assert.deepEqual(intersectRoom([0, 0, 0], [0.5, 0, 1], 3)?.point, [1, 0, 2]);
    assert.equal(intersectRoom([0, 0, 0], [0.5, 0, 1], 3)?.face, 'right');
});
test('direction scaling preserves point but scales ray parameter', () => {
    const a = intersectRoom([0.2, -0.4, 0], [-0.3, 0.6, 1], 3)!;
    const b = intersectRoom([0.2, -0.4, 0], [-0.6, 1.2, 2], 3)!;
    assert.deepEqual(a.point, b.point);
    assert.equal(a.t, b.t * 2);
});
test('alpha furniture occludes wall only on opaque parts before wall', () => {
    assert.equal(trace([0, -0.4, 0], [0, 0, 1], 3, 1)?.face, 'furniture');
    assert.equal(trace([0, 0.5, 0], [0, 0, 1], 3, 1)?.face, 'back');
    assert.equal(trace([0, -0.4, 0], [0, 0, 1], 3, 4)?.face, 'back');
});
test('finite near-parallel rays select a bounded exit and outward rays have none', () => {
    assert.equal(intersectRoom([0, 0, 0], [1e-12, 0, 1], 2)?.face, 'back');
    assert.equal(intersectRoom([0, 0, 0], [0, 0, -1], 2), null);
});
