import { test } from 'node:test';
import assert from 'node:assert/strict';
import { over, straight, decode, encode, operation } from './model.ts';
test('양쪽 알파를 포함한 문서 예제와 순서 차이', () => {
    const p = over([1, 0, 0], 0.4, [0, 0, 1], 0.25);
    assert.ok(Math.abs(p.alpha - 0.55) < 1e-12);
    assert.deepEqual(p.rgb, [0.4, 0, 0.15]);
    assert.ok(Math.abs(straight(p)[0] - 8 / 11) < 1e-12);
    assert.notDeepEqual(over([0, 0, 1], 0.25, [1, 0, 0], 0.4).rgb, p.rgb);
});
test('표현과 blend factor를 맞추면 같은 결과이며 이중 알파는 어두워진다', () => {
    const s: [number, number, number] = [0.8, 0.4, 0.2],
        b: [number, number, number] = [0.1, 0.3, 0.7];
    assert.deepEqual(over(s, 0.25, b, 0.5, false, true), over(s, 0.25, b, 0.5, true, false));
    assert.equal(over([0.8, 0, 0], 0.25, [0, 0, 0], 0, true, true).rgb[0], 0.05);
    assert.equal(over(s, 0.25, b, 0, false, true, false).alpha, 0.0625);
    assert.deepEqual(straight(over(s, 0, b, 0)), [0, 0, 0]);
});
test('선형 광량과 sRGB 혼합은 다르며 HDR 가산은 1을 넘는다', () => {
    assert.ok(Math.abs(encode(0.5) - 0.73535698) < 1e-7);
    for (const v of [0, 0.02, 0.4, 1]) assert.ok(Math.abs(encode(decode(v)) - v) < 1e-12);
    assert.equal(operation([0.4, 0.4, 0.4], 1, [0.9, 0.9, 0.9], 'add')[0], 1.3);
    assert.equal(operation([0.5, 0.5, 0.5], 1, [0.8, 0.8, 0.8], 'multiply')[0], 0.4);
});
