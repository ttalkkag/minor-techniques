import test from 'node:test';
import assert from 'node:assert/strict';
import { encode, encodeRaw, decode, restore } from './model.ts';
test('documented bit layout produces 2G68 and all supported states round-trip', () => {
    assert.equal(encode({ level: 5, items: 3 }), '2G68');
    for (let level = 1; level <= 12; level++)
        for (let items = 0; items < 256; items++) {
            const result = decode(encode({ level, items }));
            assert.equal(result.ok, true);
            if (result.ok) assert.deepEqual(result.value, { level, items });
        }
});
test('length, alphabet, checksum, version and range fail in the documented order', () => {
    for (const code of ['2G6', '2G6I', '2G69', encodeRaw(1, 5, 3), encodeRaw(0, 15, 3)])
        assert.equal(decode(code).ok, false);
    assert.throws(() => encode({ level: 13, items: 0 }), RangeError);
});
test('a compensating change bypasses the simple sum; omitted state is reset', () => {
    const changed = decode(encodeRaw(0, 6, 2, 8));
    assert.equal(changed.ok, true);
    if (changed.ok) assert.deepEqual(changed.value, { level: 6, items: 2 });
    assert.deepEqual(restore('2G68'), { level: 5, items: 3, position: 10, effect: false });
});
