import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspect, wallHit, type Settings } from './model.ts';
const s: Settings = {
    origin: { x: 0, y: 0 },
    heading: 0,
    range: 20,
    fov: 90,
    normalize: true,
    occlusion: false,
    samples: 1,
    wall: { x0: 1.8, x1: 2.2, y0: -4, y1: 0.2 },
};
test('normalization keeps direction judgment invariant under distance', () => {
    assert.equal(inspect({ x: 3, y: 4 }, s).inAngle, false);
    assert.equal(inspect({ x: 6, y: 8 }, s).inAngle, false);
    assert.equal(inspect({ x: 3, y: 4 }, { ...s, normalize: false }).inAngle, true);
    assert.equal(inspect({ x: 3, y: 3 }, s).inAngle, true);
});
test('distance, identical position, full and zero FOV boundaries', () => {
    assert.equal(inspect({ x: 21, y: 0 }, s).inRange, false);
    assert.equal(inspect({ x: 0, y: 0 }, { ...s, fov: 0 }).visible, true);
    assert.equal(inspect({ x: -1, y: 0 }, { ...s, fov: 360 }).inAngle, true);
    assert.equal(inspect({ x: 1, y: 0.1 }, { ...s, fov: 0 }).inAngle, false);
});
test('wall slabs handle parallel, before, after and inside rays', () => {
    assert.equal(wallHit({ x: 0, y: 0 }, { x: 4, y: 0 }, s.wall), 0.45);
    assert.equal(wallHit({ x: 0, y: 1 }, { x: 4, y: 1 }, s.wall), null);
    assert.equal(wallHit({ x: 0, y: 0 }, { x: 1, y: 0 }, s.wall), null);
    assert.equal(inspect({ x: 4, y: 0 }, { ...s, origin: { x: 2, y: 0 }, occlusion: true }).visible, false);
});
test('three samples detect partial exposure with exact ray budget', () => {
    assert.equal(inspect({ x: 4, y: 0 }, { ...s, occlusion: true }).visible, false);
    const r = inspect({ x: 4, y: 0 }, { ...s, occlusion: true, samples: 3 });
    assert.equal(r.visible, true);
    assert.equal(r.exposed, 1);
    assert.equal(r.rays.length, 3);
});
