import test from 'node:test';
import assert from 'node:assert/strict';
import { bitDepth, pack, unpack, paletteCost, tileCost, makeTile, expandTiles } from './model.ts';
test('13-color image includes RGB palette in 167-byte total', () => {
    assert.equal(bitDepth(13), 4);
    assert.deepEqual(paletteCost(256, 13), { rgb: 768, indices: 128, table: 39, total: 167 });
});
test('bit-packed arrays restore non-byte-aligned indices', () => {
    for (const k of [2, 3, 5, 13, 16]) {
        const data = Array.from({ length: 67 }, (_, i) => i % k);
        assert.deepEqual(unpack(pack(data, bitDepth(k)), bitDepth(k), data.length), data);
    }
});
test('tile reuse wins with repetition but loses for 100 originals', () => {
    assert.equal(tileCost(100, 10, 1, 0).copies, 1612);
    assert.equal(tileCost(100, 10, 1, 0).total, 272);
    assert.equal(tileCost(100, 100, 1, 0).total, 1712);
    assert.throws(() => tileCost(100, 257, 1, 0));
});
test('dictionary edit changes every referring placement only', () => {
    const tiles = [makeTile(0), makeTile(1)];
    const map = [0, 1, 0];
    const before = expandTiles(tiles, map, 3);
    tiles[0]![0] = 2;
    const after = expandTiles(tiles, map, 3);
    assert.equal(after.filter((v, i) => v !== before[i]).length, 2);
    assert.equal(after[0], 2);
    assert.equal(after[16], 2);
});
test('packing rejects fractional indices instead of silently changing them', () => {
    for (const value of [1.5, -1, 256, NaN, Infinity]) assert.throws(() => pack([value], 8));
    const bytes = Array.from({ length: 256 }, (_, i) => i);
    assert.deepEqual(unpack(pack(bytes, 8), 8, bytes.length), bytes);
});
