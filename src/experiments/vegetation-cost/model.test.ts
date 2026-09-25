import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, plants, grassMetrics, sway } from './model.ts';
test('same field separates 8000, 3200 and 1400 triangles from 2 instanced commands', () => {
    const settings = { ...defaults, wind: 0 };
    assert.equal(grassMetrics(settings, 0).triangles, 8000);
    const culled = grassMetrics({ ...settings, culling: true }, 0);
    assert.equal(culled.submitted, 400);
    assert.equal(culled.triangles, 3200);
    const lod = grassMetrics({ ...settings, culling: true, lod: true }, 0);
    assert.equal(lod.near, 100);
    assert.equal(lod.far, 300);
    assert.equal(lod.triangles, 1400);
    const instanced = grassMetrics({ ...settings, culling: true, lod: true, instancing: true }, 0);
    assert.equal(instanced.commands, 2);
    assert.equal(instanced.triangles, lod.triangles);
    assert.equal(instanced.fragments, lod.fragments);
});
test('wind envelope contains the animated card throughout a full cycle', () => {
    for (let time = 0; time < Math.PI * 2; time += 0.2) {
        assert.equal(grassMetrics({ ...defaults, culling: true, safeBounds: true }, time).missing, 0);
    }
    assert.ok(grassMetrics({ ...defaults, culling: true, safeBounds: false }, 1).missing > 0);
    assert.ok(sway(plants[10]!, 1, defaults, 0) === 0);
});
test('trimming blank card area reduces fragment candidates independently of triangles', () => {
    const wide = grassMetrics({ ...defaults, padding: 0.7 }, 0),
        trimmed = grassMetrics({ ...defaults, padding: 0.1 }, 0);
    assert.ok(wide.fragments > trimmed.fragments);
    assert.equal(wide.triangles, trimmed.triangles);
});
test('a shadow pass retains offscreen casters excluded by the main view', () => {
    const own = grassMetrics({ ...defaults, wind: 0, culling: true }, 0);
    const reused = grassMetrics({ ...defaults, wind: 0, culling: true, reuseMain: true }, 0);
    assert.equal(own.lostShadows, 0);
    assert.ok(reused.lostShadows > 0);
    assert.ok(own.shadowCount > reused.shadowCount);
});
