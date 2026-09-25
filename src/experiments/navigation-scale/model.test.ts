import test from 'node:test';
import assert from 'node:assert/strict';
import { clearSight, landmarkProjection } from './model.ts';
test('mountain blocks starting sight, while right branch exposes the same goal', () => {
    const goal = { x: 83, y: 12 },
        mountain = { x: 50, y: 48 };
    assert.equal(clearSight({ x: 15, y: 85 }, goal, mountain, 18), false);
    assert.equal(clearSight({ x: 76, y: 72 }, goal, mountain, 18), true);
});
test('obstacles beyond either endpoint do not block the finite sight segment', () => {
    assert.equal(clearSight({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }, 2), true);
    assert.equal(clearSight({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: -5, y: 0 }, 2), true);
    assert.equal(clearSight({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 }, 2), false);
});

test('clear sight on F-to-A does not count a landmark outside the projected screen', () => {
    const p = { x: 24, y: 40 },
        goal = { x: 83, y: 12 },
        heading = Math.atan2(-40, -8);
    assert.equal(clearSight(p, goal, { x: 50, y: 48 }, 18), true);
    const projection = landmarkProjection(p, goal, heading, 1004);
    assert.ok(projection.x > 1004);
    assert.equal(projection.onScreen, false);
});
test('A branch only exposes the landmark after turning toward the join', () => {
    const goal = { x: 83, y: 12 },
        mountain = { x: 50, y: 48 },
        heading = Math.atan2(-40, -8);
    for (let i = 0; i <= 100; i++) {
        const p = { x: 30 - (8 * i) / 100, y: 70 - (40 * i) / 100 };
        assert.equal(
            clearSight(p, goal, mountain, 18) && landmarkProjection(p, goal, heading, 320).onScreen,
            false,
        );
    }
    assert.equal(
        clearSight({ x: 22, y: 30 }, goal, mountain, 18) &&
            landmarkProjection({ x: 22, y: 30 }, goal, 0, 320).onScreen,
        true,
    );
});
test('projection excludes rear targets but includes a partially visible roof at the edge', () => {
    assert.equal(landmarkProjection({ x: 0, y: 0 }, { x: -10, y: 0 }, 0, 320).onScreen, false);
    assert.equal(landmarkProjection({ x: 0, y: 0 }, { x: 10, y: 11 }, 0, 320).onScreen, true);
    assert.equal(landmarkProjection({ x: 0, y: 0 }, { x: 10, y: 12 }, 0, 320).onScreen, false);
});
