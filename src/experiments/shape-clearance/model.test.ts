import test from 'node:test';
import assert from 'node:assert/strict';
import { clearance, defaults } from './model.ts';
test('a ray succeeds through 0.6m opening but a 0.8m capsule cannot fit', () => {
    const r = clearance(defaults);
    assert.equal(r.surface, true);
    assert.equal(r.space, false);
    assert.ok(Math.abs(r.sideGap + 0.1) < 1e-12);
    assert.ok(Math.abs(r.centers[0]! - 3.4) < 1e-12);
    assert.ok(Math.abs(r.centers[1]! - 4.4) < 1e-12);
});
test('width equality permits contact while insufficient headroom blocks placement', () => {
    assert.equal(clearance({ ...defaults, width: 0.8, ceiling: 1.8 }).allowed, true);
    assert.equal(clearance({ ...defaults, width: 1.2, ceiling: 1.79 }).space, false);
});
test('slope contact uses a tangent lower sphere and rejects angles beyond 30 degrees', () => {
    const angle = (30 * Math.PI) / 180;
    const r = clearance({ ...defaults, width: 2, slope: 30 });
    assert.ok(Math.abs((r.centers[0]! - 3) * Math.cos(angle) - defaults.radius) < 1e-12);
    assert.equal(r.slope, true);
    assert.equal(clearance({ ...defaults, slope: 31 }).slope, false);
});
test('endpoint fit does not permit a normal sweep through the solid slab', () => {
    const r = clearance({ ...defaults, width: 2, travel: 'sweep' });
    assert.equal(r.space, true);
    assert.equal(r.path, false);
    assert.equal(r.allowed, false);
    assert.equal(clearance({ ...defaults, width: 2, obstacle: true }).allowed, false);
    assert.equal(clearance({ ...defaults, range: 2.59 }).surface, false);
});
