import test from 'node:test';
import assert from 'node:assert/strict';
import {
    bump,
    encode,
    decode,
    normalAt,
    tangentNormal,
    toWorld,
    cosine,
    normalize,
    srgbToLinear,
} from './model.ts';
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
test('RGB restores unit directions and the documented light cosine', () => {
    assert.deepEqual(decode([0.5, 0.5, 1]), [0, 0, 1]);
    const n = decode([0.8, 0.5, 0.9]);
    close(cosine(n, [0, 0, 1]), 0.8);
    const original = normalize([0.4, -0.3, 0.7]);
    decode(encode(original)).forEach((v, i) => close(v, original[i]!));
});
test('analytic bump derivative matches central finite difference', () => {
    const u = 0.3,
        v = -0.1,
        phase = 0.6,
        e = 1e-5;
    close(bump(u, v, phase).dx, (bump(u + e, v, phase).height - bump(u - e, v, phase).height) / (2 * e));
    close(bump(u, v, phase).dy, (bump(u, v + e, phase).height - bump(u, v - e, phase).height) / (2 * e));
});
test('world basis preserves length and reflects the flat plane rotation', () => {
    const yaw = Math.PI / 3;
    const n = toWorld([0, 0, 1], yaw);
    close(n[0], Math.sin(yaw));
    close(n[2], 0.5);
    close(Math.hypot(...toWorld(tangentNormal(0.3, -0.1, 0.5, 1), yaw)), 1);
});
test('sprite reflection reverses x but not y; gamma conversion tilts neutral normal', () => {
    const n = normalAt(-0.3, -0.1, 0.5, 1, 0, false, 'none');
    const mirrored = normalAt(0.3, -0.1, 0.5, 1, 0, true, 'none');
    close(n[0], -mirrored[0]);
    close(n[1], mirrored[1]);
    const broken = normalAt(0.3, -0.1, 0.5, 1, 0, true, 'flip');
    close(broken[0], n[0]);
    assert.ok(srgbToLinear(0.5) < 0.22);
    assert.ok(decode([srgbToLinear(0.5), srgbToLinear(0.5), 1])[0] < -0.4);
});
