import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, firstMargin, stream } from './model.ts';
test('30m at 6m/s leaves one second; doubling speed is 1.5 seconds late', () => {
    assert.equal(firstMargin(defaults), 1);
    assert.equal(firstMargin({ ...defaults, speed: 12 }), -1.5);
});
test('insufficient overlap memory prevents preparing the next chunk', () => {
    const s = stream({ ...defaults, budget: 64 }, 10);
    assert.ok(s.x < 30);
    assert.equal(s.memoryBlocked, true);
    assert.equal(s.missing, 1);
    assert.ok(s.waiting > 4);
    assert.ok(s.peak <= 64);
});
test('adequate prediction and memory traverse the same path without waiting', () => {
    const s = stream(defaults, 12);
    assert.ok(Math.abs(s.x - 72) < 0.01);
    assert.equal(s.waiting, 0);
    assert.ok(s.peak <= defaults.budget);
});
test('u-turn can require reloading an evicted chunk; retention trades memory for it', () => {
    const dropped = stream({ ...defaults, budget: 128, turns: [6] }, 10),
        retained = stream({ ...defaults, budget: 128, retain: true, turns: [6] }, 10);
    assert.ok(dropped.chunks[0]!.loads > retained.chunks[0]!.loads);
    assert.ok(dropped.waiting > retained.waiting);
});

test('a second turn preserves the previous route and reverses from the current position', () => {
    const before = stream({ ...defaults, budget: 128, turns: [6] }, 10);
    const turned = { ...defaults, budget: 128, turns: [6, 10] };
    const after = stream(turned, 10);
    assert.equal(after.x, before.x);
    assert.equal(before.dir, -1);
    assert.equal(after.dir, 1);
    assert.ok(stream(turned, 10.1).x > after.x);
    assert.equal(stream({ ...turned, turns: [6, 10, 10] }, 10).dir, -1);
});

test('turning between fixed ticks preserves position and changes the next partial step', () => {
    const time = 6.023;
    const before = stream(defaults, time);
    const turned = { ...defaults, turns: [time] };
    const after = stream(turned, time);
    assert.ok(Math.abs(after.x - before.x) < 1e-9);
    assert.equal(after.dir, -1);
    assert.ok(stream(turned, time + 0.01).x < after.x);
});

test('a chunk can be needed before the prediction range requests it', () => {
    const o = { ...defaults, prediction: 10, sight: 15, budget: 160, gate: false };
    assert.ok(Math.abs(firstMargin(o) + 29 / 6) < 1e-12);
    const b = stream(o, 8).chunks[1]!;
    assert.ok(Math.abs(b.need! - b.ready! - firstMargin(o)) <= 0.051);
    assert.ok(b.need! < b.request!);
});
