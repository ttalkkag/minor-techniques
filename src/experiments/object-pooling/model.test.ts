import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, defaults } from './model.ts';
test('1200 requests reuse ten simultaneous instances and drain at 60.45 seconds', () => {
    const s = simulate(defaults, 60.45, 60);
    assert.equal(s.shots, 1200);
    assert.equal(s.created, 10);
    assert.equal(s.firstUse, 10);
    assert.equal(s.reuses, 1190);
    assert.equal(s.maxActive, 10);
    assert.equal(s.returned, 1200);
    assert.equal(s.active.length, 0);
});
test('inactive retention cap does not cap a burst of concurrent objects', () => {
    const s = simulate({ ...defaults, burst: true }, 0);
    assert.equal(s.active.length, 15);
    assert.equal(s.created, 15);
    const drained = simulate({ ...defaults, burst: true }, 1);
    assert.equal(drained.idle.length, 10);
    assert.equal(drained.destroyed, 5);
});
test('generation guard prevents old expiry callbacks ending a new lease', () => {
    const unsafe = simulate({ ...defaults, early: true, guard: false }, 3),
        safe = simulate({ ...defaults, early: true, guard: true }, 3);
    assert.ok(unsafe.contaminated > 0);
    assert.equal(safe.contaminated, 0);
    assert.equal(new Set(safe.idle.map((x) => x.id)).size, safe.idle.length);
});
test('rejecting requests is a visible behavior change rather than equivalent pooling', () => {
    const s = simulate({ ...defaults, burst: true, overflow: 'reject' }, 0);
    assert.equal(s.dropped, 5);
    assert.equal(s.active.length, 10);
});
