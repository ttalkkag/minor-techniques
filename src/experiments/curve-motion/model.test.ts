import test from 'node:test';
import assert from 'node:assert/strict';
import { cubic, table, lookup, type Curve } from './model.ts';
test('distance lookup recovers half of a nonuniform straight cubic', () => {
    const p: Curve = [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
    ];
    assert.equal(cubic(p, 0.5).x, 1.25);
    assert.ok(Math.abs(cubic(p, lookup(table(p, 1024), 0.5)).x - 5) < 0.00002);
});
test('degenerate curve has a stable finite lookup and refined lengths converge', () => {
    const zero: Curve = Array.from({ length: 4 }, () => ({ x: 3, y: 7 })) as Curve;
    assert.equal(lookup(table(zero, 16), 0.9), 0);
    const p: Curve = [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: -10 },
        { x: 10, y: 0 },
    ];
    const length = (n: number) => table(p, n).at(-1)!.s;
    assert.ok(length(64) > length(4));
    assert.ok(length(4096) - length(64) < length(4096) - length(4));
    assert.equal(lookup(table(p, 64), 1), 1);
});
