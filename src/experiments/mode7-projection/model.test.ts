import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowPoint, rayPoint, affinePoint, mapBoundary } from './model.ts';
test('row sampling distance follows inverse vertical distance from horizon', () => {
    assert.equal(rowPoint(140, 46, 2, 0, 0)!.t, 30);
    assert.equal(rowPoint(140, 136, 2, 0, 0)!.t, 3);
    assert.equal(rowPoint(140, 36, 2, 0, 0), null);
});
test('independent normalized 3D rays match row formula across rotation and height', () => {
    for (const yaw of [-2, 0, 1.2])
        for (const h of [0.5, 2, 5])
            for (const y of [37, 70, 179])
                for (const x of [0, 140, 279]) {
                    const a = rowPoint(x, y, h, yaw, -8)!,
                        b = rayPoint(x, y, h, yaw, -8)!;
                    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-9);
                }
});
test('row spacing changes with height while affine spacing stays fixed; wrapping includes negatives', () => {
    const near = rowPoint(141, 136, 2, 0, 0)!.x,
        far = rowPoint(141, 46, 2, 0, 0)!.x;
    assert.equal(far / near, 10);
    assert.equal(affinePoint(141, 40, 0, 0).x, affinePoint(141, 150, 0, 0).x);
    assert.deepEqual(mapBoundary(-13, 13, 'repeat'), [11, -11]);
    assert.equal(mapBoundary(12, 0, 'empty'), null);
});

test('the 100m cutoff includes every pixel along a row at that forward depth', () => {
    for (const height of [1, 3, 5]) {
        const y = 36 + (150 * height) / 100;
        for (let x = 0; x < 280; x++) {
            assert.equal(rowPoint(x + 0.5, y, height, 0, -8)!.t, 100);
            assert.equal(rayPoint(x + 0.5, y, height, 0, -8)!.t, 100);
        }
    }
});
