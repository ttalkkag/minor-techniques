import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, coverBlocks, defaults, positionAt } from './model.ts';
import { clipFrame, timing } from './clip.ts';

test('the clip orders local firing, server arrival, and the returned result', () => {
    const options = { ...defaults, up: 120, down: 70 };
    assert.deepEqual(timing(options), { start: 600, fire: 880, arrive: 1000, confirm: 1070, end: 1200 });
    assert.equal(timing({ ...defaults, down: 200 }).end, 1320);
    for (const [time, phase, fired, resolved, confirmed] of [
        [879, 'ready', false, false, false],
        [880, 'shot', true, false, false],
        [1000, 'query', true, true, false],
        [1070, 'result', true, true, true],
    ] as const) {
        const frame = clipFrame(options, time, 'free', true);
        assert.equal(frame.phase, phase);
        assert.equal(frame.fired, fired);
        assert.equal(frame.resolved, resolved);
        assert.equal(frame.confirmed, confirmed);
    }
});

test('shooter observes a delayed world and receives the verdict only after the return trip', () => {
    const shooter = clipFrame(defaults, 960, 'shooter', true);
    const observer = clipFrame(defaults, 960, 'free', true);
    assert.equal(shooter.worldTime, 880);
    assert.equal(observer.worldTime, 960);
    assert.equal(shooter.scene.targetX, shooter.result.aim);
    assert.equal(shooter.scene.targetCovered, false);
    assert.equal(observer.scene.targetCovered, true);
    assert.equal(clipFrame(defaults, 1000, 'free', true).scene.result, 'hit');
    const awaiting = clipFrame(defaults, 1000, 'shooter', true);
    assert.equal(awaiting.scene.result, 'pending');
    assert.equal(awaiting.scene.ghostVisible, false);
    assert.equal(clipFrame(defaults, 1040, 'shooter', true).scene.result, 'hit');
    assert.equal(clipFrame(defaults, 1040, 'shooter', true).scene.ghostVisible, true);
});

test('the query ghost never moves the present target back in time', () => {
    const frame = clipFrame(defaults, 1100, 'free', true);
    assert.equal(frame.worldTime, 1000);
    assert.equal(frame.scene.targetX, positionAt(1000, defaults.speed, false));
    assert.equal(frame.scene.moving, false);
    assert.equal(frame.scene.ghostX, frame.result.queryX);
    assert.notEqual(frame.scene.ghostX, frame.scene.targetX);
    assert.equal(frame.scene.ghostVisible, true);
    assert.equal(coverBlocks(frame.scene.ghostX), false);
    assert.equal(frame.scene.targetCovered, true);
    assert.equal(frame.scene.trace, 'query');
    assert.deepEqual(clipFrame(defaults, 1100, 'target', true).scene, frame.scene);
});

test('current policy misses the covered target but does not move the original shot into the wall', () => {
    const current = clipFrame({ ...defaults, mode: 'current' }, 1000, 'free', true);
    assert.equal(current.scene.result, 'miss');
    assert.equal(current.scene.ghostX, current.scene.targetX);
    assert.equal(current.scene.ghostVisible, false);
    assert.equal(current.scene.trace, 'query');
    assert.equal(current.scene.traceBlocked, false);
    assert.equal(current.scene.targetCovered, true);
    assert.equal(clipFrame(defaults, 1000, 'free', true).scene.result, 'hit');
});

test('shot traces are instantaneous and test the same static cover as the query', () => {
    const firing = clipFrame(defaults, 960, 'free', false);
    assert.equal(firing.scene.trace, 'shot');
    assert.equal(firing.scene.shotFlash, 1);
    assert.equal(firing.scene.traceBlocked, false);
    assert.equal(firing.scene.targetCovered, true);
    assert.equal(clipFrame(defaults, 960, 'free', false, 0.6).scene.traceBlocked, true);
    assert.equal(clipFrame(defaults, 1000, 'free', true, 0.6).scene.traceBlocked, true);
    assert.equal(clipFrame(defaults, 972, 'free', false).scene.shotFlash, 0.5);
    assert.equal(clipFrame(defaults, 984, 'free', false).scene.trace, 'none');
    assert.equal(clipFrame(defaults, 1000, 'free', false).scene.ghostVisible, false);
    assert.equal(clipFrame(defaults, 1000, 'free', false).scene.trace, 'none');
});

test('scrubbing changes target coverage without moving or creating the cover', () => {
    const fixed = { ...arena };
    for (const time of [600, 880, 960, 1000, 1100, 700]) {
        const frame = clipFrame(defaults, time, 'free', true, 0.6);
        assert.equal(frame.scene.traceBlocked, true);
        assert.equal(frame.scene.targetCovered, coverBlocks(frame.scene.targetX));
        assert.deepEqual(arena, fixed);
    }
    assert.equal(clipFrame(defaults, 600, 'free', true).scene.targetCovered, false);
    assert.equal(clipFrame(defaults, 1000, 'free', true).scene.targetCovered, true);
});

test('rejected commands do not reveal query geometry or a hit pulse', () => {
    for (const options of [{ ...defaults, window: 50 }, { ...defaults, claim: 'future' as const }]) {
        const frame = clipFrame(options, 1040, 'shooter', true);
        assert.equal(frame.scene.result, 'rejected');
        assert.equal(frame.scene.ghostVisible, false);
        assert.equal(frame.scene.trace, 'none');
        assert.equal(frame.scene.hitPulse, 0);
    }
});

test('scrubbing backwards removes future effects and repeated timestamps are deterministic', () => {
    const before = clipFrame(defaults, 950, 'free', true);
    assert.equal(clipFrame(defaults, 1000, 'free', true).scene.hitPulse, 1);
    assert.equal(clipFrame(defaults, 1030, 'free', true).scene.hitPulse, 0.5);
    assert.equal(clipFrame(defaults, 1060, 'free', true).scene.hitPulse, 0);
    const rewound = clipFrame(defaults, 950, 'free', true);
    assert.deepEqual(rewound, before);
    assert.equal(rewound.scene.trace, 'none');
    assert.equal(rewound.scene.shotFlash, 0);
    assert.equal(rewound.scene.hitPulse, 0);
    assert.equal(rewound.scene.result, 'pending');
    assert.equal(rewound.scene.ghostVisible, false);
});

test('zero network delay resolves all phases at the same instant with the target already in cover', () => {
    const options = { ...defaults, up: 0, down: 0, interpolation: 0 };
    const frame = clipFrame(options, 1000, 'shooter', true);
    assert.equal(frame.phase, 'result');
    assert.equal(frame.fired && frame.resolved && frame.confirmed, true);
    assert.equal(frame.scene.result, 'blocked');
    const shifted = clipFrame(options, 1000, 'shooter', true, -0.6);
    assert.equal(shifted.scene.result, 'miss');
    assert.equal(shifted.scene.aimX, frame.scene.aimX - 0.6);
    assert.equal(shifted.scene.targetX, frame.scene.targetX);
    assert.equal(shifted.scene.hitPulse, 0);
});
