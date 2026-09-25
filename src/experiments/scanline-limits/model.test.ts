import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSprites, selectLine } from './model.ts';
test('nine sprites exceed eight slots only on shared lines', () => {
    const sprites = makeSprites(9, 1, 0);
    assert.equal(selectLine(sprites, 40, 8, 0, 'fixed', false).missing[0]?.id, 8);
    assert.equal(selectLine(sprites, 48, 8, 0, 'fixed', false).candidates.length, 0);
    const staggered = makeSprites(9, 1, 8);
    assert.equal(selectLine(staggered, 40, 8, 0, 'fixed', false).missing.length, 0);
    assert.equal(selectLine(staggered, 48, 8, 0, 'fixed', false).selected.length, 1);
});
test('rotation distributes one missing frame per sprite without exceeding eight', () => {
    const sprites = makeSprites(9, 1, 0);
    const counts = Array(9).fill(0);
    for (let frame = 0; frame < 9; frame++) {
        const result = selectLine(sprites, 40, 8, frame, 'rotate', false);
        assert.equal(result.selected.length, 8);
        for (const sprite of result.selected) counts[sprite.id]++;
    }
    assert.deepEqual(counts, Array(9).fill(8));
});
test('composite characters use multiple slots and protected player retains priority', () => {
    const sprites = makeSprites(9, 4, 0);
    assert.equal(selectLine(sprites, 40, 8, 0, 'fixed', false).candidates.length, 18);
    for (let f = 0; f < sprites.length; f++) {
        assert.deepEqual(
            selectLine(sprites, 40, 8, f, 'rotate', true)
                .selected.slice(0, 2)
                .map((s) => s.owner),
            [0, 0],
        );
    }
});
