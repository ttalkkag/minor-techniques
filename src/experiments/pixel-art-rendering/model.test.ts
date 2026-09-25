import test from 'node:test';
import assert from 'node:assert/strict';
import {
    sprite,
    sample,
    raster,
    stripeWidths,
    displayPosition,
    brightnessPair,
    dither,
    colors,
    linearToSrgb,
} from './model.ts';
test('1.5x point sampling gives unequal pixel widths, integer 2x equal widths', () => {
    assert.deepEqual(stripeWidths(1.5), [1, 2, 1, 2]);
    assert.deepEqual(stripeWidths(2), [2, 2, 2, 2]);
});
test('nearest keeps palette while linear creates intermediary values', () => {
    const p = sprite(false);
    assert.deepEqual(sample(p, 3, 0, 'nearest'), colors[1]);
    const r = raster(p, 1.5, 0, 'nearest');
    assert.ok(r.pixels.every((c) => colors.some((o) => o.every((v, i) => v === c[i]))));
    const blend = sample(p, 2.5, 0, 'linear');
    assert.ok(!colors.some((c) => c.every((v, i) => v === blend[i])));
});
test('snap changes display position without changing world input', () => {
    const x = 0.37;
    assert.equal(displayPosition(x, 4, true), 0.25);
    assert.equal(x, 0.37);
    assert.equal(displayPosition(x, 4, false), x);
});
test('color pair conserves light and moves brightness centroid; dither has discrete colors', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const [a, b] = brightnessPair(t);
        assert.equal(a + b, 1);
        assert.equal(b / (a + b), t);
        assert.equal(
            dither(t).reduce((s, v) => s + v, 0),
            64 * t,
        );
    }
    assert.ok(linearToSrgb(0.5) > 0.73);
});

test('the source contour toggle changes one actual pixel', () => {
    const base = sprite(false);
    assert.equal(sprite(true).filter((v, i) => v !== base[i]).length, 1);
});
