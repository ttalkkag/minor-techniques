import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, shoot, segmentBox, toward } from './model.ts';
test('eye sees target but muzzle is blocked; lowering cover clears the final shot', () => {
    assert.deepEqual(shoot(defaults).results, ['표적', '엄폐물', '엄폐물']);
    assert.equal(shoot({ ...defaults, cover: 0.8 }).hit?.id, '표적');
});
test('muzzle parallel direction misses the reticle target even with clear cover', () => {
    const shot = shoot({ ...defaults, cover: 0.5 });
    assert.equal(shot.parallelHit, null);
    assert.equal(shot.hit?.id, '표적');
});
test('weapon range is measured from muzzle; masks and inside starts are explicit', () => {
    const limited = shoot({ ...defaults, cover: 0.5, range: 3 });
    assert.equal(limited.hit, null);
    assert.ok(
        Math.abs(Math.hypot(limited.end.x - limited.muzzle.x, limited.end.y - limited.muzzle.y) - 3) < 1e-10,
    );
    assert.equal(shoot({ ...defaults, cover: 0.5, decoration: true }).hit?.id, '장식');
    assert.match(shoot({ ...defaults, ignoreSelf: false }).rejected, /자기 몸/);
    assert.match(shoot({ ...defaults, muzzleX: 2.3 }).rejected, /엄폐물 내부/);
});
test('zero segments and behind-muzzle targets do not normalize a zero direction', () => {
    assert.deepEqual(toward({ x: 1, y: 1 }, { x: 1, y: 1 }, 10), { x: 1, y: 1 });
    assert.equal(segmentBox({ x: 0, y: 0 }, { x: 0, y: 4 }, { id: 'wall', x: 1, y: 1, w: 1, h: 1 }), null);
    assert.match(shoot({ ...defaults, cameraY: 1.1, muzzleX: 3 }).rejected, /뒤 목표/);
});
