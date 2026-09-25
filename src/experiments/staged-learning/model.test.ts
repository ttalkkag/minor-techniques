import test from 'node:test';
import assert from 'node:assert/strict';
import { stoppingDistance, floorAt, jumpSample, JumpInput } from './model.ts';
test('stronger braking shortens stopping distance by inverse proportion', () => {
    assert.equal(stoppingDistance(6, 9), 2);
    assert.equal(stoppingDistance(6, 18), 1);
});
test('safe trench has a floor while abyss does not', () => {
    assert.equal(floorAt(26, false), -1.5);
    assert.equal(floorAt(40, false), -100);
    assert.equal(floorAt(9, false), 0);
    assert.equal(floorAt(9, true), -100);
});
test('release gravity lowers height; fall gravity changes flight time, not peak', () => {
    const normal = jumpSample(1, 1),
        cut = jumpSample(3, 1),
        fall = jumpSample(1, 3);
    assert.ok(cut.peak < normal.peak);
    assert.equal(fall.peak, normal.peak);
    assert.ok(fall.time < normal.time);
});
test('restarting a replay during its held jump creates a new jump press', () => {
    const input = new JumpInput();
    input.startReplay();
    assert.equal(input.step(1 / 120, false).pressed, true);
    assert.equal(input.step(0.03, false).pressed, false);
    input.startReplay();
    assert.deepEqual(input.step(1 / 120, false), { down: true, pressed: true });
    input.step(0.12, false);
    input.reset();
    assert.equal(input.replaying, false);
    assert.deepEqual(input.step(1 / 120, false), { down: false, pressed: false });
});
test('layout or full reset cancels replay and clears the old held edge', () => {
    const input = new JumpInput();
    input.startReplay();
    input.step(0.03, false);
    input.reset();
    assert.equal(input.replaying, false);
    assert.deepEqual(input.step(1 / 120, true), { down: true, pressed: true });
    assert.equal(input.step(1 / 120, true).pressed, false);
    input.step(1 / 120, false);
    assert.equal(input.step(1 / 120, true).pressed, true);
});
