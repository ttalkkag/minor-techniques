import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceSimulation, createSimulation, overlapSphere, stepSimulation, sweepSphere } from './physics.ts';

const near = (actual: number | null, expected: number) => {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) < 1e-9, `${actual} != ${expected}`);
};

test('default endpoint samples miss the wall while the path stops at first contact', () => {
  const state = createSimulation();
  assert.equal(stepSimulation(state), true);
  assert.equal(state.discrete.status, 'missed');
  assert.equal(state.discrete.x, 4);
  assert.equal(state.discrete.hitTime, null);
  assert.equal(state.continuous.status, 'hit');
  near(state.continuous.x, -0.31);
  near(state.continuous.hitTime, 4.69 / 90);
  assert.equal(state.continuous.prev, -5);
  assert.equal(state.continuous.next, 4);
  assert.equal(state.tick, 1);
  near(state.time, 0.1);
  assert.equal(state.discrete.checks, 1);
  assert.equal(state.continuous.checks, 1);
});

test('the 120 Hz preset detects overlap later than the unchanged first contact', () => {
  const state = createSimulation({ hz: 120 });
  advanceSimulation(state, 1);
  assert.equal(state.discrete.status, 'hit');
  assert.equal(state.continuous.status, 'hit');
  near(state.discrete.x, 0.25);
  near(state.discrete.hitTime, 7 / 120);
  near(state.continuous.x, -0.31);
  near(state.continuous.hitTime, 4.69 / 90);
  assert.equal(state.tick, 7);
  assert.equal(state.discrete.checks, 7);
  assert.equal(state.continuous.checks, 7);
});

test('120 Hz can still miss when the start position shifts between samples', () => {
  const state = createSimulation({ hz: 120, start: -4.9 });
  advanceSimulation(state, 1);
  assert.equal(state.discrete.status, 'missed');
  assert.equal(state.continuous.status, 'hit');
  near(state.continuous.hitTime, 4.59 / 90);
});

test('finished bodies and the physics clock remain unchanged after completion', () => {
  const state = createSimulation();
  stepSimulation(state);
  const completed = structuredClone(state);
  assert.equal(stepSimulation(state), false);
  assert.equal(advanceSimulation(state, 100), 0);
  assert.deepEqual(state, completed);
});

test('an initial overlap is an immediate contact, including a stationary body', () => {
  const state = createSimulation({ start: 0, speed: 0 });
  for (const body of [state.discrete, state.continuous]) {
    assert.equal(body.status, 'hit');
    assert.equal(body.hitTime, 0);
    assert.equal(body.hitX, 0);
    assert.equal(body.checks, 0);
  }
  assert.equal(stepSimulation(state), false);
  assert.equal(advanceSimulation(state, 1), 0);
  assert.equal(state.tick, 0);
  assert.equal(state.accumulator, 0);
});

test('closed boundaries include exact touches and reject separated or receding motion', () => {
  const shape = { radius: 0.2, thickness: 0.4 };
  assert.equal(overlapSphere({ x: -0.4, ...shape }), true);
  assert.equal(overlapSphere({ x: 0.4, ...shape }), true);
  assert.equal(overlapSphere({ x: -0.40001, ...shape }), false);
  const hit = sweepSphere({ from: -1, to: -0.4, ...shape });
  assert.ok(hit);
  near(hit.fraction, 1);
  near(hit.x, -0.4);
  near(hit.contactX, -0.2);
  assert.equal(sweepSphere({ from: -1, to: -1, ...shape }), null);
  assert.equal(sweepSphere({ from: -1, to: -2, ...shape }), null);
  assert.equal(sweepSphere({ from: -0.4, to: -1, ...shape })?.fraction, 0);
  const stationary = createSimulation({ speed: 0 });
  advanceSimulation(stationary, 1);
  assert.equal(stationary.discrete.status, 'pending');
  assert.equal(stationary.continuous.status, 'pending');
  assert.equal(stationary.discrete.x, -5);
});

test('reverse motion mirrors the contact position and preserves contact time', () => {
  const state = createSimulation({ speed: -90, start: 5, end: -7 });
  stepSimulation(state);
  assert.equal(state.discrete.status, 'missed');
  assert.equal(state.discrete.x, -4);
  assert.equal(state.continuous.status, 'hit');
  near(state.continuous.x, 0.31);
  near(state.continuous.hitTime, 4.69 / 90);
  const hit = sweepSphere({ from: 5, to: -4, radius: 0.16, thickness: 0.3 });
  assert.ok(hit);
  near(hit.contactX, 0.15);
});

test('moving the wall preserves local collision geometry', () => {
  const hit = sweepSphere({ from: 5, to: 14, radius: 0.16, thickness: 0.3, wallX: 10 });
  assert.ok(hit);
  near(hit.x, 9.69);
  near(hit.contactX, 9.85);
  near(hit.fraction, 4.69 / 9);
});

test('different render frame partitions preserve fixed-step state and contact results', () => {
  const config = { speed: 8, hz: 60 };
  const coarse = createSimulation(config);
  const fine = createSimulation(config);
  advanceSimulation(coarse, 0.2);
  for (let frame = 0; frame < 24; frame += 1) advanceSimulation(fine, 1 / 120);
  assert.equal(coarse.tick, 12);
  assert.equal(fine.tick, coarse.tick);
  assert.deepEqual(fine.discrete, coarse.discrete);
  assert.deepEqual(fine.continuous, coarse.continuous);
  near(fine.accumulator, coarse.accumulator);
  advanceSimulation(coarse, 1);
  for (let frame = 0; frame < 120; frame += 1) advanceSimulation(fine, 1 / 120);
  assert.deepEqual(fine, coarse);
  assert.equal(coarse.continuous.status, 'hit');
  assert.equal(coarse.discrete.status, 'hit');
});

test('a trip ending before the wall terminates without contact', () => {
  const state = createSimulation({ speed: 1, hz: 10, start: -5, end: -4 });
  advanceSimulation(state, 10);
  assert.equal(state.tick, 10);
  assert.equal(state.discrete.status, 'missed');
  assert.equal(state.continuous.status, 'missed');
  assert.equal(state.continuous.hitTime, null);
});

test('representative control combinations preserve first contact and the sample spacing guarantee', () => {
  for (const speed of [5, 90, 150]) {
    for (const hz of [5, 10, 120, 240]) {
      for (const radius of [0.05, 0.16, 0.6]) {
        for (const thickness of [0.1, 0.3, 3]) {
          const state = createSimulation({ speed, hz, radius, thickness });
          advanceSimulation(state, 2);
          assert.equal(state.continuous.status, 'hit');
          near(state.continuous.x, -thickness / 2 - radius);
          near(state.continuous.hitTime, (5 - thickness / 2 - radius) / speed);
          if (speed / hz <= thickness + 2 * radius) {
            assert.equal(state.discrete.status, 'hit');
          }
          if (state.discrete.status === 'hit') {
            assert.ok(overlapSphere({ x: state.discrete.x, radius, thickness }));
            assert.ok(state.discrete.hitTime! + 1e-9 >= state.continuous.hitTime!);
          }
        }
      }
    }
  }
});
