import test from 'node:test';
import assert from 'node:assert/strict';
import { castRay, columnRay, makeMap, projection } from './model.ts';

test('axis-parallel rays reach the expected wall without infinite arithmetic', () => {
    const grid = makeMap('flat');
    const east = castRay(grid, { x: 3.5, y: 5 }, { x: 1, y: 0 })!;
    assert.equal(east.distance, 3.5);
    assert.equal(east.x, 7);
    const north = castRay(grid, { x: 3.5, y: 5 }, { x: 0, y: -1 })!;
    assert.equal(north.distance, 4);
    assert.equal(north.y, 0);
    assert.ok(north.cells.every((cell) => Number.isFinite(cell.distance)));
});

test('all rays to a perpendicular wall have the same forward depth', () => {
    const grid = makeMap('flat');
    for (const fraction of [0.02, 0.25, 0.5, 0.75, 0.98]) {
        const ray = columnRay(0, Math.PI / 2, fraction);
        const hit = castRay(grid, { x: 3.5, y: 5 }, ray.direction)!;
        assert.equal(hit.x, 7);
        const result = projection(hit.distance, ray.offset, 200, 2);
        assert.ok(Math.abs(result.depth - 3.5) < 1e-10);
        assert.ok(Math.abs(result.correctedHeight - 400 / 3.5) < 1e-8);
        assert.ok(result.rawHeight <= result.correctedHeight + 1e-9);
    }
});

test('the 60 degree numerical example gives 50 px instead of 100 px', () => {
    const result = projection(8, Math.PI / 3, 200, 2);
    assert.equal(result.rawHeight, 50);
    assert.ok(Math.abs(result.correctedHeight - 100) < 1e-10);
});

test('closed grid corners stop a ray at either touching wall', () => {
    const grid = [
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 0, 1],
        [1, 1, 1, 1],
    ];
    const hit = castRay(grid, { x: 1.5, y: 1.5 }, { x: 1, y: 1 })!;
    assert.equal(hit.x, 2);
    assert.equal(hit.y, 1);
    assert.ok(Math.abs(hit.distance - Math.SQRT1_2) < 1e-10);
});

test('inside wall, zero direction, and open map have explicit bounded results', () => {
    assert.equal(castRay(makeMap('flat'), { x: 7.5, y: 5 }, { x: 1, y: 0 })?.side, 'inside');
    assert.equal(castRay([[0]], { x: 0.5, y: 0.5 }, { x: 0, y: 0 }), null);
    assert.equal(castRay([[0]], { x: 0.5, y: 0.5 }, { x: 1, y: 0 }), null);
});
