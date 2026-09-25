import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeParty, decodeParty, bitplanes, restorePixels, rle, unrle, tilePreset } from './model.ts';
test('three common levels serialize to 5 bytes versus 8 with markers included', () => {
    const party = [33, 34, 35].map((species) => ({ level: 20, species, move: null }));
    assert.deepEqual(encodeParty(party, 'auto'), [20, 33, 34, 35, 0]);
    assert.equal(encodeParty(party, 'pairs').length, 8);
    assert.deepEqual(decodeParty(encodeParty(party, 'auto')), party);
    party[1]!.level = 22;
    assert.equal(encodeParty(party, 'auto').length, 8);
    assert.deepEqual(decodeParty(encodeParty(party, 'auto')), party);
});
test('independent move exception survives either party representation', () => {
    const p = [
        { level: 20, species: 33, move: null },
        { level: 20, species: 34, move: 99 },
    ];
    for (const format of ['auto', 'pairs'] as const)
        assert.deepEqual(decodeParty(encodeParty(p, format), [2, 99, 0]), p);
    assert.throws(() => decodeParty([20, 33]));
});
test('document tile bytes and layout affect RLE only after reordering', () => {
    const p = tilePreset('stripe');
    assert.deepEqual(bitplanes(p, false).slice(0, 2), [0x5a, 0x3c]);
    assert.equal(rle(bitplanes(p, false), false).length, 33);
    assert.equal(rle(bitplanes(p, true), true).length, 5);
});
test('all pixels round-trip for regular, uniform, noisy and edited inputs', () => {
    for (const preset of ['stripe', 'solid', 'noise'])
        for (const planar of [false, true]) {
            const p = tilePreset(preset);
            p[13] = (p[13]! + 1) % 4;
            const d = unrle(rle(bitplanes(p, planar), planar));
            assert.equal(d.data.length, 16);
            assert.deepEqual(restorePixels(d.data, d.planar), p);
        }
});
test('party codecs reject fractional and out-of-range byte values', () => {
    for (const value of [20.5, -1, 256, NaN, Infinity]) {
        assert.throws(() => encodeParty([{ level: value, species: 33, move: null }], 'auto'));
        assert.throws(() => encodeParty([{ level: 20, species: value, move: null }], 'pairs'));
        assert.throws(() => decodeParty([20, value, 0]));
        assert.throws(() => decodeParty([20, 33, 0], [1, value, 0]));
    }
});
test('valid party boundary values survive a real byte buffer', () => {
    const party = [
        { level: 1, species: 1, move: null },
        { level: 100, species: 254, move: null },
    ];
    for (const format of ['auto', 'pairs'] as const) {
        const encoded = encodeParty(party, format);
        assert.deepEqual([...Uint8Array.from(encoded)], encoded);
        assert.deepEqual(decodeParty([...Uint8Array.from(encoded)]), party);
    }
});
test('tile codecs reject fractional colors and bytes before bit conversion', () => {
    const pixels = tilePreset('stripe');
    pixels[0] = 1.5;
    assert.throws(() => bitplanes(pixels, false));
    assert.throws(() => rle([1.5], false));
    assert.throws(() => unrle([160, 1, 1.5]));
    assert.throws(() => restorePixels([1.5, ...Array(15).fill(0)], false));
});
