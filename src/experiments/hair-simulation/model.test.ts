import test from 'node:test';
import assert from 'node:assert/strict';
import { makeChain, stepChain, interpolate, projectOutside } from './model.ts';
test('pinned root stays fixed and length constraints bound stretch under gravity', () => {
    const chain = makeChain(0, 0, 12, 0);
    for (let i = 0; i < 500; i++) stepChain(chain, { x: 0, y: 0 }, 220, 80, [], 0, false, 1 / 120);
    assert.equal(chain[0].x, 0);
    assert.equal(chain[0].y, 0);
    for (let i = 1; i < chain.length; i++)
        assert.ok(
            Math.abs(Math.hypot(chain[i].x - chain[i - 1].x, chain[i].y - chain[i - 1].y) - 220 / 12) < 0.2,
        );
});
test('circle projection removes guide particle penetration', () => {
    const chain = makeChain(0, -70, 10, 0),
        circle = { x: 0, y: 0, r: 45 };
    for (let i = 0; i < 120; i++) stepChain(chain, { x: 0, y: -70 }, 220, 100, [circle], 3, true, 1 / 120);
    assert.ok(chain.slice(1).every((p) => Math.hypot(p.x, p.y) >= 48 - 1e-8));
});
test('render interpolation does not add simulation particles or modify guides', () => {
    const a = makeChain(0, 0, 4, 0),
        b = makeChain(10, 0, 4, 0),
        before = JSON.stringify([a, b]);
    for (let i = 0; i < 300; i++) {
        const render = interpolate(a, b, i / 299);
        assert.equal(render.length, 5);
    }
    assert.equal(JSON.stringify([a, b]), before);
    assert.equal(interpolate(a, b, 0.5)[0].x, 5);
});

test('overlapping shoulder colliders project to the outside of their union', () => {
    const point = { x: 490, y: 285, px: 490, py: 285 };
    const circles = [
        { x: 449, y: 278, r: 57 },
        { x: 551, y: 278, r: 57 },
    ];
    projectOutside(point, circles, 5);
    assert.ok(circles.every((c) => Math.hypot(point.x - c.x, point.y - c.y) >= 62 - 1e-6));
});
