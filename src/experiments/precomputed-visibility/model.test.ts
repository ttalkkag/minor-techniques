import test from 'node:test';
import assert from 'node:assert/strict';
import { blocks, cameraAt, visible, precompute, lookup, compare, binAt, targets } from './model.ts';

test('segment occlusion rejects blockers behind the target and outside the ray', () => {
    const a = { x: 0, y: 0 },
        b = { x: 0, y: 10 };
    assert.equal(blocks(a, b, { a: { x: -2, y: 5 }, b: { x: 2, y: 5 } }), true);
    assert.equal(blocks(a, b, { a: { x: -2, y: 15 }, b: { x: 2, y: 15 } }), false);
    assert.equal(blocks(a, b, { a: { x: 2, y: 5 }, b: { x: 4, y: 5 } }), false);
});

test('every baked sample is contained by its own interval union', () => {
    const bake = precompute(8, 5, true);
    for (let state = 0; state < 2; state++) {
        for (let bin = 0; bin < 8; bin++) {
            for (let sample = 0; sample < 5; sample++) {
                for (const id of visible(cameraAt((bin + sample / 4) / 8), state === 1)) {
                    assert.ok(bake.states[state]![bin]!.has(id));
                }
            }
        }
    }
    assert.equal(bake.evaluations, 80);
    assert.equal(bake.bytes, 80);
});

test('only interval endpoints fail to include visibility at the middle', () => {
    const bake = precompute(2, 2, false);
    const missing = compare(visible(cameraAt(0.25), false), lookup(bake, 0.25, false, false)).missing;
    assert.ok(missing.size > 0);
});

test('opening the door invalidates the closed bake; a matching state includes its sample', () => {
    const required = visible(cameraAt(0.5), true);
    const closed = lookup(precompute(8, 5, false), 0.5, true, false);
    const both = lookup(precompute(8, 5, true), 0.5, true, false);
    assert.ok(compare(required, closed).missing.size > 0);
    assert.equal(compare(required, both).missing.size, 0);
    assert.ok(required.size > visible(cameraAt(0.5), false).size);
});

test('enlarged FOV or path deviation can exceed the stored baseline', () => {
    const bake = precompute(8, 5, false);
    let fovMisses = 0,
        deviationMisses = 0;
    for (let i = 0; i <= 100; i++) {
        const s = i / 100,
            stored = lookup(bake, s, false, false);
        fovMisses += compare(visible(cameraAt(s, 0, 110), false), stored).missing.size;
        deviationMisses += compare(visible(cameraAt(s, 22, 60), false), stored).missing.size;
    }
    assert.ok(fovMisses > 0);
    assert.ok(deviationMisses > 0);
});

test('neighbor union never removes a submission; reversible lookup handles endpoints', () => {
    const bake = precompute(8, 5, false);
    assert.equal(binAt(1, 8), 7);
    assert.equal(binAt(-0.1, 8), 0);
    const first = lookup(bake, 0.34, false, false);
    lookup(bake, 0.8, false, false);
    assert.deepEqual(lookup(bake, 0.34, false, false), first);
    const neighbors = lookup(bake, 0.34, false, true);
    for (const id of first) assert.ok(neighbors.has(id));
    assert.equal(compare(visible(cameraAt(0.5), true), new Set(targets.map((p) => p.id))).missing.size, 0);
});
