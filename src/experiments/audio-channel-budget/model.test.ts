import assert from 'node:assert/strict';
import test from 'node:test';
import { requestEffect, ownerAt, pcmBytes, pitchSample } from './model.ts';
test('lower priority cannot steal active effect, equal can be explicitly replaced', () => {
    const owner = { kind: 'effect' as const, priority: 3, until: 5, id: 1 };
    assert.equal(requestEffect(owner, 2, 1, 2, true, 2).accepted, false);
    assert.equal(requestEffect(owner, 3, 1, 2, false, 2).accepted, false);
    assert.equal(requestEffect(owner, 3, 1, 2, true, 2).owner.id, 2);
    assert.equal(ownerAt(owner, 5).kind, 'music');
});
test('PCM includes stored channels and sample pitch changes duration', () => {
    assert.equal(pcmBytes(60, 48000, 16, 2), 11520000);
    assert.deepEqual(pitchSample(12, 2), { rate: 2, duration: 1 });
});
